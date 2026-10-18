const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const solicitudesModel = require('../models/solicitudes.model');
const usuariosModel = require('../models/usuarios.model');
const restaurantesModel = require('../models/restaurantes.model');
const planesModel = require('../models/planes.model');
const rolesModel = require('../models/roles.model');
const { NotFoundError, ConflictError, TooManyRequestsError, BadRequestError } = require('../errors');
const { clearFeatureCache } = require('../middlewares/features');
const suscripciones = require('./suscripciones.service');
const { enviarCorreo, correoConBoton } = require('../utils/correo');

// Reglas de negocio de las solicitudes de cuenta.
//
// El endpoint de creación es PÚBLICO y escribe en la base, así que lleva dos
// frenos contra el envío automatizado:
//   1. Trampa (honeypot): un campo que el formulario oculta por CSS. Una persona
//      no lo ve y lo deja vacío; un bot rellena todo lo que encuentra. Si viene
//      lleno se responde OK sin guardar, para no enseñarle al bot qué falló.
//   2. Límite por IP en ventana de tiempo, contado contra la propia tabla.
const MAX_POR_IP = 3;
const VENTANA_MINUTOS = 10;

// Las mismas rondas que usa usuarios.service, para que un hash no se distinga de
// otro por su coste.
const RONDAS_BCRYPT = 10;

const crear = async ({ trampa, password, ...datos }, ip) => {
  if (trampa) return { registrada: true };

  const recientes = await solicitudesModel.contarRecientesPorIp(ip, VENTANA_MINUTOS);
  if (recientes >= MAX_POR_IP) {
    throw new TooManyRequestsError('Ya recibimos tu solicitud. Te contactamos muy pronto.');
  }

  // Correo ya registrado, o solicitud suya todavía sin resolver: se responde lo
  // MISMO que en el caso bueno y no se guarda nada.
  //
  // Es a propósito. Si aquí dijéramos "ese correo ya existe", este formulario
  // público se convertiría en una forma de averiguar qué restaurantes son
  // clientes de Antojate probando correos, uno por uno, sin ninguna credencial.
  // El precio es que quien se equivoca no se entera al momento; lo ve el
  // superadmin en la bandeja, que es quien puede resolverlo.
  if (datos.email) {
    const [yaEsUsuario, yaPidio] = await Promise.all([
      usuariosModel.buscarPorEmail(datos.email),
      solicitudesModel.pendientePorEmail(datos.email),
    ]);
    if (yaEsUsuario || yaPidio) return { registrada: true };
  }

  // Se cifra ANTES de guardar: la contraseña en claro no toca la base ni un
  // instante, ni siquiera mientras la solicitud espera aprobación.
  const password_hash = password ? await bcrypt.hash(password, RONDAS_BCRYPT) : null;

  await solicitudesModel.crear({ ...datos, password_hash, ip_origen: ip });

  // No se devuelve la fila: es un endpoint público y el interesado no necesita
  // ver ids ni la IP que guardamos.
  return { registrada: true };
};

const listar = (filtros) => solicitudesModel.listar(filtros);

const ESTADOS = ['nueva', 'contactada', 'cerrada', 'aprobada', 'rechazada'];

const resumen = async () => {
  const filas = await solicitudesModel.contarPorEstado();
  // El panel espera siempre todos los estados, aunque alguno vaya en cero.
  const base = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  return { ...base, ...Object.fromEntries(filas.map((f) => [f.estado, f.total])) };
};

const actualizarSeguimiento = async (id, datos) => {
  const actualizadas = await solicitudesModel.actualizarSeguimiento(id, datos);
  if (actualizadas === 0) {
    // 0 filas puede ser "no existe" o "mandaste los mismos valores"; se
    // distingue consultando, para no responder 404 sobre algo que sí existe.
    const existe = await solicitudesModel.buscarPorId(id);
    if (!existe) throw new NotFoundError('Solicitud no encontrada');
    return existe;
  }
  return solicitudesModel.buscarPorId(id);
};

// --- Aprobación: convertir la solicitud en un cliente de verdad ---

async function rolAdminRestaurante() {
  const rol = await rolesModel.buscarPorNombre('admin_restaurante');
  if (!rol) {
    throw new BadRequestError(
      'Falta el rol admin_restaurante en la base. Ejecuta: npm run seed:roles'
    );
  }
  return rol;
}

/**
 * Crea restaurante + suscripción + usuario administrador a partir de la solicitud.
 *
 * Va TODO en una transacción por una razón concreta: si fallara a mitad, quedaría
 * un restaurante sin dueño (nadie puede entrar a administrarlo) o un usuario
 * apuntando a un restaurante inexistente. Los dos casos hay que arreglarlos a mano
 * en la base, y el segundo además rompe el login.
 */
const aprobar = async (id, { plan_id }, actor) => {
  const solicitud = await solicitudesModel.buscarConPasswordPorId(id);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');

  if (solicitud.estado === 'aprobada') {
    throw new ConflictError('Esta solicitud ya fue aprobada');
  }
  if (solicitud.estado === 'rechazada') {
    throw new ConflictError('Esta solicitud fue rechazada. Pídele al restaurante que la envíe de nuevo.');
  }
  if (!solicitud.email || !solicitud.password_hash) {
    throw new BadRequestError(
      'Esta solicitud es del formulario de contacto antiguo: no trae correo ni contraseña, así que no se puede convertir en cuenta. Crea el restaurante a mano.'
    );
  }

  // El correo pudo registrarse entre que se envió la solicitud y ahora.
  const ocupado = await usuariosModel.buscarPorEmail(solicitud.email);
  if (ocupado) {
    throw new ConflictError(`Ya existe un usuario con el correo ${solicitud.email}`);
  }

  const planId = plan_id ?? solicitud.plan_id;
  if (!planId) throw new BadRequestError('Indica con qué plan se aprueba la cuenta');
  const plan = await planesModel.buscarPorId(planId);
  if (!plan) throw new NotFoundError('Plan no encontrado');

  const rol = await rolAdminRestaurante();

  const conn = await pool.getConnection();
  let restauranteId;
  let usuarioId;
  try {
    await conn.beginTransaction();

    // Nace 'activo': aprobar ES el acto de darle acceso. Dejarlo en 'pendiente'
    // obligaría al superadmin a activarlo en otra pantalla, y hasta entonces el
    // dueño entraría al panel para encontrarse el menú bloqueado.
    restauranteId = await restaurantesModel.crear(
      { nombre: solicitud.restaurante_nombre, plan_id: planId, estado: 'activo' },
      conn
    );
    await restaurantesModel.crearSuscripcion(restauranteId, planId, conn, {
      diasPrueba: suscripciones.DIAS_PRUEBA,
    });

    // Se reutiliza el hash que ya se guardó al enviar la solicitud: así el dueño
    // entra con la contraseña que él eligió y nadie tiene que mandársela.
    usuarioId = await usuariosModel.crear(
      {
        nombre: solicitud.contacto_nombre,
        email: solicitud.email,
        password_hash: solicitud.password_hash,
        restaurante_id: restauranteId,
        role_id: rol.id,
      },
      conn
    );

    const marcadas = await solicitudesModel.marcarAprobada(
      id,
      { restaurante_id: restauranteId, usuario_id: usuarioId, plan_id: planId, revisada_por: actor.id },
      conn
    );
    // 0 filas = otro administrador la resolvió mientras tanto. Se deshace todo
    // en vez de crear un segundo restaurante para la misma solicitud.
    if (marcadas === 0) throw new ConflictError('Otro administrador ya resolvió esta solicitud');

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (usuariosModel.esEmailDuplicado(err)) {
      throw new ConflictError(`Ya existe un usuario con el correo ${solicitud.email}`);
    }
    throw err;
  } finally {
    conn.release();
  }

  clearFeatureCache(restauranteId);
  // En segundo plano: si el correo falla, la cuenta ya está creada y el
  // superadmin puede avisar por otro medio. No se deshace un alta por un correo.
  avisarAprobacion(solicitud, plan).catch((err) =>
    console.error(`[solicitudes] no se pudo enviar el correo de bienvenida: ${err.message}`)
  );
  return solicitudesModel.buscarPorId(id);
};

// Antes nadie le avisaba al solicitante: su cuenta existía y él no lo sabía
// hasta que alguien lo llamaba.
const urlSitio = () =>
  (
    process.env.SITIO_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://bitemo.co' : 'http://localhost:5173')
  ).replace(/\/$/, '');

async function avisarAprobacion(solicitud, plan) {
  const { html, texto } = correoConBoton({
    saludo: solicitud.contacto_nombre ? `Hola, ${solicitud.contacto_nombre}:` : 'Hola:',
    parrafos: [
      `Aprobamos la cuenta de ${solicitud.restaurante_nombre} en Antojate, con el plan ${plan.nombre}.`,
      `Tienes ${suscripciones.DIAS_PRUEBA} días de prueba gratis para montar tu carta con video, imprimir los QR de tus mesas y probarlo con tus clientes.`,
      'Entra con este correo y la contraseña que elegiste al solicitarla.',
    ],
    boton: { texto: 'Entrar a mi panel', url: `${urlSitio()}/login` },
    nota: 'Si olvidaste la contraseña, en la pantalla de entrada puedes pedir una nueva.',
  });
  await enviarCorreo({
    para: solicitud.email,
    asunto: `Tu cuenta de Antojate está lista: ${solicitud.restaurante_nombre}`,
    html,
    texto,
  });
}

const rechazar = async (id, { motivo }, actor) => {
  const solicitud = await solicitudesModel.buscarPorId(id);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');
  if (solicitud.estado === 'aprobada') {
    throw new ConflictError('Esta solicitud ya fue aprobada: no se puede rechazar');
  }

  const rechazadas = await solicitudesModel.marcarRechazada(id, { motivo, revisada_por: actor.id });
  if (rechazadas === 0) throw new ConflictError('Otro administrador ya resolvió esta solicitud');
  return solicitudesModel.buscarPorId(id);
};

module.exports = { crear, listar, resumen, actualizarSeguimiento, aprobar, rechazar };
