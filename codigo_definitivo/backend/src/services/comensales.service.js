const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const comensalesModel = require('../models/comensales.model');
const codigosModel = require('../models/codigosComensal.model');
const sesiones = require('./sesionesComensal.service');
const social = require('./social.service');
const { generarCodigo, hashCodigo, mismoHash } = require('../utils/codigos');
const { enviarCorreo, correoConCodigo } = require('../utils/correo');
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} = require('../errors');

// La cuenta del comensal: alta, acceso, perfil, clave, correo y baja.
//
// Nada de aquí usa `usuarios` ni el JWT del staff (ver utils/jwt.js). La cuenta
// no es obligatoria para explorar la app: se pide cuando hace falta (reservar,
// comentar), así que cada paso de este archivo tiene que ser rápido y claro.

// Las mismas rondas que el staff, para que un hash no se distinga de otro.
const RONDAS_BCRYPT = 10;

const PROPOSITOS = {
  VERIFICAR_CORREO: 'verificar_correo',
  RESTABLECER_CLAVE: 'restablecer_clave',
};

// Un código de 6 dígitos lo protegen tres topes a la vez: vence rápido, admite
// pocos intentos y no se pueden pedir muchos seguidos. Con estos números, adivinar
// uno a ciegas tiene menos de una probabilidad entre 60.000 por hora.
const MINUTOS_CODIGO = 15;
const MAX_INTENTOS_CODIGO = 5;
const MAX_CODIGOS_POR_HORA = 3;

// Lo único que sale de una cuenta hacia la app. Se enumera en vez de borrar el
// hash de la fila: así un campo interno nuevo no se publica solo por existir.
const perfilPublico = (c) => ({
  id: c.id,
  nombre: c.nombre,
  email: c.email,
  telefono: c.telefono || null,
  email_verificado: Boolean(c.email_verificado_en),
  creado_en: c.creado_en,
});

const conPerfil = (comensal, sesion) => ({ comensal: perfilPublico(comensal), ...sesion });

const codigoInvalido = () => new BadRequestError('El código no es válido o ya venció. Pide uno nuevo.');

// Ejecuta `trabajo` dentro de una transacción y devuelve lo que devuelva.
async function enTransaccion(trabajo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await trabajo(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// --- Códigos por correo ---

const CORREOS = {
  [PROPOSITOS.VERIFICAR_CORREO]: (nombre) => ({
    asunto: 'Confirma tu correo en Antojate',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: ['Escribe este código en la app para confirmar tu correo:'],
    nota: `Vence en ${MINUTOS_CODIGO} minutos. Si no creaste una cuenta en Antojate, ignora este correo.`,
  }),
  [PROPOSITOS.RESTABLECER_CLAVE]: (nombre) => ({
    asunto: 'Cambia tu contraseña de Antojate',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: [
      'Recibimos una solicitud para cambiar la contraseña de tu cuenta de Antojate. Escribe este código en la app:',
    ],
    nota: `Vence en ${MINUTOS_CODIGO} minutos y sirve una sola vez. Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.`,
  }),
};

// Crea un código nuevo (anulando los anteriores del mismo propósito) y lo manda
// por correo. Anular y crear van juntos para que nunca queden dos vivos: cada
// uno tendría sus propios intentos y el tope se multiplicaría.
async function enviarCodigo(comensal, proposito, ip) {
  const codigo = generarCodigo();
  await enTransaccion(async (conn) => {
    await codigosModel.anularVivos(comensal.id, proposito, conn);
    await codigosModel.crear(
      {
        comensalId: comensal.id,
        proposito,
        codigoHash: hashCodigo({ comensalId: comensal.id, proposito, codigo }),
        minutos: MINUTOS_CODIGO,
        ip,
      },
      conn
    );
  });

  const { asunto, ...contenido } = CORREOS[proposito](comensal.nombre);
  const { html, texto } = correoConCodigo({ ...contenido, codigo });
  await enviarCorreo({ para: comensal.email, asunto, html, texto });
}

// Comprueba un código DENTRO de la transacción de quien llama, y lo gasta si es
// correcto. Si no lo es, suma el intento: quien llama tiene que hacer COMMIT
// igual, o el intento fallido se desharía con el rollback y el tope no serviría.
async function consumirCodigo(comensalId, proposito, codigo, conn) {
  const vivo = await codigosModel.buscarVivo(comensalId, proposito, MAX_INTENTOS_CODIGO, conn, {
    bloquear: true,
  });
  if (!vivo) return false;

  if (!mismoHash(vivo.codigo_hash, hashCodigo({ comensalId, proposito, codigo }))) {
    await codigosModel.sumarIntento(vivo.id, conn);
    return false;
  }

  await codigosModel.marcarUsado(vivo.id, conn);
  return true;
}

// --- Alta y acceso ---

/**
 * Crea la cuenta y deja la sesión abierta en ese mismo paso: quien se registra
 * a mitad de una reserva vuelve a ella sin tener que entrar otra vez.
 *
 * "Ese correo ya tiene cuenta" SÍ se dice (409). Callarlo protegería contra
 * averiguar quién usa Antojate, pero dejaría atascado a quien olvidó que ya se
 * registró, y saber que alguien tiene cuenta de comensal no es un dato sensible.
 * El freno de tasa del registro limita el sondeo masivo.
 */
async function registrar({ nombre, email, password, telefono }, contexto = {}) {
  const password_hash = await bcrypt.hash(password, RONDAS_BCRYPT);

  let comensal;
  let sesion;
  try {
    ({ comensal, sesion } = await enTransaccion(async (conn) => {
      const id = await comensalesModel.crear({ nombre, email, telefono, password_hash }, conn);
      const nuevo = await comensalesModel.buscarPorId(id, conn);
      return { comensal: nuevo, sesion: await sesiones.abrir(nuevo, contexto, conn) };
    }));
  } catch (err) {
    if (comensalesModel.esEmailDuplicado(err)) {
      throw new ConflictError('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
    }
    throw err;
  }

  // El código de verificación sale en segundo plano: el alta no espera al correo.
  enviarCodigo(comensal, PROPOSITOS.VERIFICAR_CORREO, contexto.ip).catch((err) =>
    console.error(`[comensales] no se pudo enviar la verificación: ${err.message}`)
  );

  // Lo que este teléfono marcó sin cuenta ("me gusta", guardados) pasa a la
  // cuenta nueva (decisión D6). Se espera para que la app, al recargar, ya lo
  // vea del lado de la cuenta; si falla no tumba el alta.
  await social.adoptarDispositivo(contexto.dispositivoId, comensal.id);

  return conPerfil(comensal, sesion);
}

async function iniciarSesion({ email, password }, contexto = {}) {
  const comensal = await comensalesModel.buscarPorEmail(email);
  // Mismo mensaje para correo inexistente y clave incorrecta.
  if (!comensal || !(await bcrypt.compare(password, comensal.password_hash))) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  await comensalesModel.registrarAcceso(comensal.id);
  const sesion = await sesiones.abrir(comensal, contexto);
  // Igual que al registrarse: lo marcado en este teléfono se suma a la cuenta.
  await social.adoptarDispositivo(contexto.dispositivoId, comensal.id);
  return conPerfil(comensal, sesion);
}

async function refrescar(refreshToken, contexto = {}) {
  const { comensal, ...sesion } = await sesiones.renovar(refreshToken, contexto);
  await comensalesModel.registrarAcceso(comensal.id);
  return conPerfil(comensal, sesion);
}

const cerrarSesion = (refreshToken) => sesiones.cerrar(refreshToken);

// --- Perfil ---

async function perfil(comensalId) {
  const comensal = await comensalesModel.buscarPorId(comensalId);
  if (!comensal) throw new NotFoundError('Cuenta no encontrada');
  return perfilPublico(comensal);
}

async function actualizarPerfil(comensalId, { nombre, telefono }) {
  await comensalesModel.actualizarPerfil(comensalId, { nombre, telefono });
  return perfil(comensalId);
}

/**
 * Cambia la clave. Pide la actual aunque el token ya identifique a quien llama:
 * un teléfono desbloqueado un minuto no debe bastar para quedarse con la cuenta.
 * Cierra TODAS las sesiones (el caso típico: te la robaron y la cambias para
 * echar al intruso) y abre una nueva en este dispositivo.
 */
async function cambiarPassword(comensalId, { actual, nueva }, contexto = {}) {
  const fila = await comensalesModel.passwordPorId(comensalId);
  if (!fila) throw new NotFoundError('Cuenta no encontrada');

  // 400 y no 401: la app trata un 401 como "sesión caducada" y cerraría la
  // sesión por un error de tecleo.
  if (!(await bcrypt.compare(actual, fila.password_hash))) {
    throw new BadRequestError('La contraseña actual no es correcta');
  }

  const hash = await bcrypt.hash(nueva, RONDAS_BCRYPT);
  const resultado = await enTransaccion(async (conn) => {
    await comensalesModel.guardarPassword(comensalId, hash, conn);
    await sesiones.revocarAccesos(comensalId, conn);
    await sesiones.cerrarTodas(comensalId, conn);
    const comensal = await comensalesModel.buscarPorId(comensalId, conn);
    return conPerfil(comensal, await sesiones.abrir(comensal, contexto, conn));
  });
  sesiones.olvidar(comensalId);
  return resultado;
}

// --- Correo ---

async function enviarVerificacion(comensalId, ip) {
  const comensal = await comensalesModel.buscarPorId(comensalId);
  if (!comensal) throw new NotFoundError('Cuenta no encontrada');
  if (comensal.email_verificado_en) return { ya_verificado: true };

  const recientes = await codigosModel.contarRecientes(comensalId, PROPOSITOS.VERIFICAR_CORREO, 60);
  if (recientes >= MAX_CODIGOS_POR_HORA) {
    throw new TooManyRequestsError('Ya te enviamos varios códigos. Espera un rato antes de pedir otro.');
  }

  await enviarCodigo(comensal, PROPOSITOS.VERIFICAR_CORREO, ip);
  return { enviado: true, minutos_vigencia: MINUTOS_CODIGO };
}

async function confirmarVerificacion(comensalId, codigo) {
  const valido = await enTransaccion(async (conn) => {
    const ok = await consumirCodigo(comensalId, PROPOSITOS.VERIFICAR_CORREO, codigo, conn);
    if (ok) await comensalesModel.marcarEmailVerificado(comensalId, conn);
    return ok;
  });
  if (!valido) throw codigoInvalido();
  return perfil(comensalId);
}

// --- Recuperar la clave ---

// Trabajo real de `solicitarRecuperacion`. Quien lo llama no espera su resultado.
async function procesarRecuperacion(email, ip) {
  const comensal = await comensalesModel.buscarPorEmail(email);
  if (!comensal) return;

  const recientes = await codigosModel.contarRecientes(comensal.id, PROPOSITOS.RESTABLECER_CLAVE, 60);
  if (recientes >= MAX_CODIGOS_POR_HORA) return;

  await enviarCodigo(comensal, PROPOSITOS.RESTABLECER_CLAVE, ip);
}

/**
 * Responde lo mismo exista o no la cuenta, y el envío va en segundo plano para
 * que tampoco lo delate el tiempo de respuesta. Aquí sí se calla: pedir códigos
 * para un correo ajeno no debe servir para saber si tiene cuenta.
 */
function solicitarRecuperacion(email, ip) {
  procesarRecuperacion(email, ip).catch((err) =>
    console.error(`[comensales] no se pudo procesar la recuperación: ${err.message}`)
  );
  return { mensaje: 'Si ese correo tiene una cuenta en Antojate, te enviamos un código de 6 dígitos.' };
}

/**
 * Pone una clave nueva con el código del correo y deja la sesión abierta.
 * Cierra todas las demás sesiones, y de paso da el correo por verificado: quien
 * recibió el código es dueño del buzón.
 */
async function restablecer({ email, codigo, password }, contexto = {}) {
  const comensal = await comensalesModel.buscarPorEmail(email);
  if (!comensal) throw codigoInvalido();

  // Primero sin candado: un correo sin código vivo no debe costar un bcrypt, que
  // es lo lento, ni abrir una transacción.
  const vivo = await codigosModel.buscarVivo(comensal.id, PROPOSITOS.RESTABLECER_CLAVE, MAX_INTENTOS_CODIGO);
  if (!vivo) throw codigoInvalido();
  const hash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const resultado = await enTransaccion(async (conn) => {
    const ok = await consumirCodigo(comensal.id, PROPOSITOS.RESTABLECER_CLAVE, codigo, conn);
    if (!ok) return null;

    await comensalesModel.guardarPassword(comensal.id, hash, conn);
    await comensalesModel.marcarEmailVerificado(comensal.id, conn);
    await sesiones.revocarAccesos(comensal.id, conn);
    await sesiones.cerrarTodas(comensal.id, conn);
    const actualizado = await comensalesModel.buscarPorId(comensal.id, conn);
    return conPerfil(actualizado, await sesiones.abrir(actualizado, contexto, conn));
  });

  if (!resultado) throw codigoInvalido();
  sesiones.olvidar(comensal.id);
  return resultado;
}

// --- Baja ---

/**
 * Borra la cuenta de verdad (App Store 5.1.1(v), Google Play y Ley 1581): la
 * fila desaparece y caen en cascada sus sesiones, códigos, "me gusta",
 * guardados, comentarios, reportes, bloqueos y eventos (claves ajenas con ON
 * DELETE CASCADE, ver 2026-10-12_app_feed.sql). Pide la clave para que un
 * teléfono prestado no baste. Cuando existan reservas, este es el sitio donde
 * decidir qué se borra y qué se anonimiza.
 */
async function eliminarCuenta(comensalId, password) {
  const fila = await comensalesModel.passwordPorId(comensalId);
  if (!fila) throw new NotFoundError('Cuenta no encontrada');
  if (!(await bcrypt.compare(password, fila.password_hash))) {
    throw new BadRequestError('La contraseña no es correcta');
  }

  await comensalesModel.eliminar(comensalId);
  sesiones.olvidar(comensalId);
}

module.exports = {
  PROPOSITOS,
  MINUTOS_CODIGO,
  MAX_INTENTOS_CODIGO,
  MAX_CODIGOS_POR_HORA,
  perfilPublico,
  registrar,
  iniciarSesion,
  refrescar,
  cerrarSesion,
  perfil,
  actualizarPerfil,
  cambiarPassword,
  enviarVerificacion,
  confirmarVerificacion,
  solicitarRecuperacion,
  restablecer,
  eliminarCuenta,
};
