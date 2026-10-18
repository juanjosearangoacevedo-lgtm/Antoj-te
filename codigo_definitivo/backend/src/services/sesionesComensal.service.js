const pool = require('../config/db');
const comensalesModel = require('../models/comensales.model');
const sesionesModel = require('../models/sesionesComensal.model');
const { firmarComensal, VIGENCIA_COMENSAL_SEGUNDOS } = require('../utils/jwt');
const { tokenAleatorio, hashToken } = require('../utils/codigos');
const { UnauthorizedError } = require('../errors');

// Sesiones del comensal en la app móvil.
//
// Dos tokens, cada uno con su trabajo:
//   - access token: JWT de 15 minutos que viaja en cada petición. No se consulta
//     la base para validarlo, salvo la versión de sesión (con caché, abajo).
//   - refresh token: 256 bits de azar, guardado en el llavero del teléfono y en
//     la base solo como hash. Sirve para pedir un access token nuevo, y rota en
//     cada uso. Es lo que se revoca al cerrar sesión en un dispositivo.
//
// Una app no puede pedir la clave cada 8 horas como el panel: la sesión dura
// DIAS_SESION desde el último uso (vencimiento deslizante).

const DIAS_SESION = 60;

// Tras rotar, el token anterior vale estos segundos más: el teléfono pudo pedir
// el nuevo y perder la respuesta (un túnel, un ascensor). Ver models/sesionesComensal.
const GRACIA_ROTACION_SEGUNDOS = 120;

const sesionInvalida = () =>
  new UnauthorizedError('Tu sesión terminó. Vuelve a iniciar sesión.', { codigo: 'SESION_INVALIDA' });

// Lo que recibe la app al entrar o renovar. `sid` va dentro del access token
// para saber de qué dispositivo viene cada petición.
function respuesta(comensal, sesionId, refreshToken) {
  return {
    access_token: firmarComensal({
      sub: String(comensal.id),
      sv: Number(comensal.sesion_version || 0),
      sid: sesionId,
    }),
    refresh_token: refreshToken,
    expira_en_segundos: VIGENCIA_COMENSAL_SEGUNDOS,
  };
}

/**
 * Abre una sesión nueva para este dispositivo. Acepta una conexión para ir
 * dentro de la transacción de quien llama (alta, cambio de clave).
 */
async function abrir(comensal, { dispositivoId, plataforma } = {}, db = pool) {
  const refresh = tokenAleatorio();
  const sesionId = await sesionesModel.crear(
    { comensalId: comensal.id, refreshHash: hashToken(refresh), dispositivoId, plataforma, dias: DIAS_SESION },
    db
  );
  return respuesta(comensal, sesionId, refresh);
}

/**
 * Cambia un refresh token por un par nuevo. Devuelve también la fila del
 * comensal: la app la usa al arrancar para pintar el perfil sin otra petición.
 */
async function renovar(refreshToken, { dispositivoId, plataforma } = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sesion = await sesionesModel.buscarVivaPorHash(hashToken(refreshToken), GRACIA_ROTACION_SEGUNDOS, conn, {
      bloquear: true,
    });
    if (!sesion) throw sesionInvalida();

    const comensal = await comensalesModel.buscarPorId(sesion.comensal_id, conn);
    if (!comensal) throw sesionInvalida();

    const nuevo = tokenAleatorio();
    await sesionesModel.rotar(
      sesion.id,
      {
        nuevoHash: hashToken(nuevo),
        desdeVigente: Boolean(Number(sesion.es_vigente)),
        dias: DIAS_SESION,
        dispositivoId,
        plataforma,
      },
      conn
    );

    await conn.commit();
    return { comensal, ...respuesta(comensal, sesion.id, nuevo) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Cierra la sesión de este dispositivo. No dice si el token existía: cerrar una
// sesión que ya no está abierta es, para quien la cierra, lo mismo.
const cerrar = async (refreshToken) => {
  await sesionesModel.revocarPorHash(hashToken(refreshToken));
};

const cerrarTodas = (comensalId, db = pool) => sesionesModel.revocarTodas(comensalId, db);

// --- Versión de sesión (revocación inmediata de los access tokens) ---
//
// Misma idea y mismo TTL que services/sesiones.service.js del staff. Cambiar o
// restablecer la clave sube la versión, y borrar la cuenta la deja sin versión:
// en los dos casos, los access tokens vivos dejan de valer en la petición
// siguiente (o a los 30 s si el cambio lo hizo otro proceso).

const TTL_MS = 30 * 1000;
const cache = new Map(); // comensalId -> { version, vence }
const clave = (id) => Number(id);

async function versionActual(comensalId) {
  const guardada = cache.get(clave(comensalId));
  if (guardada && guardada.vence > Date.now()) return guardada.version;

  const version = await comensalesModel.versionSesion(comensalId);
  cache.set(clave(comensalId), { version, vence: Date.now() + TTL_MS });
  return version;
}

// ¿Sigue valiendo el payload de este access token?
async function vigente(payload) {
  const version = await versionActual(payload.sub);
  if (version === null) return false; // la cuenta ya no existe
  return Number(payload.sv ?? 0) === version;
}

// Sube la versión dentro de la transacción de quien llama. Hay que llamar a
// `olvidar` DESPUÉS del commit, o otra petición podría volver a guardar en caché
// la versión vieja mientras la transacción sigue abierta.
const revocarAccesos = (comensalId, db = pool) => comensalesModel.subirVersionSesion(comensalId, db);

function olvidar(comensalId) {
  cache.delete(clave(comensalId));
}

module.exports = {
  DIAS_SESION,
  GRACIA_ROTACION_SEGUNDOS,
  abrir,
  renovar,
  cerrar,
  cerrarTodas,
  vigente,
  versionActual,
  revocarAccesos,
  olvidar,
};
