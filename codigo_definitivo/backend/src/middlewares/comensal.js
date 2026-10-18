const { verificarComensal } = require('../utils/jwt');
const { UnauthorizedError } = require('../errors');
const sesiones = require('../services/sesionesComensal.service');

// Identidad en la API de la app móvil (/api/app/v1).
//
// Es un mundo aparte del staff: otro token (ver utils/jwt.js), otra tabla y
// otros middlewares. Ningún middleware de aquí sirve para rutas del panel, ni
// `authenticate` sirve para rutas de la app.

// El UUID que la app genera en su primer arranque y manda en cada petición. No
// es una credencial (cualquiera puede inventarse uno): identifica el teléfono
// para lo que no exige cuenta, como los "me gusta" o los guardados anónimos.
// Algo que no tenga forma de UUID se ignora en vez de rechazar la petición.
const PATRON_DISPOSITIVO = /^[A-Za-z0-9-]{16,64}$/;
const PLATAFORMAS = ['ios', 'android', 'web'];

function leerDispositivo(req, res, next) {
  const id = req.headers['x-dispositivo'];
  const plataforma = req.headers['x-plataforma'];
  req.dispositivoId = typeof id === 'string' && PATRON_DISPOSITIVO.test(id) ? id : null;
  req.plataforma = PLATAFORMAS.includes(plataforma) ? plataforma : null;
  next();
}

// Toda sesión rechazada lleva este código: la app lo reconoce, renueva el token
// una vez y, si tampoco puede, cierra la sesión en el teléfono.
const sesionInvalida = () =>
  new UnauthorizedError('Tu sesión terminó. Vuelve a iniciar sesión.', { codigo: 'SESION_INVALIDA' });

// Lee el token de comensal si viene. Sin cabecera devuelve null (visitante
// anónimo); con una cabecera que no vale, lanza: quien manda un token espera
// que se use, y ignorarlo en silencio escondería una sesión caducada.
async function leerComensal(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  if (!header.startsWith('Bearer ')) throw sesionInvalida();

  let payload;
  try {
    payload = verificarComensal(header.slice('Bearer '.length));
  } catch {
    throw sesionInvalida();
  }

  // Si la base no responde, esto lanza un error de servidor (500), no un 401:
  // el fallo es nuestro, no del token.
  if (!(await sesiones.vigente(payload))) throw sesionInvalida();

  return { id: Number(payload.sub), sesionId: payload.sid ?? null };
}

// Rutas que funcionan sin cuenta pero se personalizan con ella (el feed).
async function identificarComensal(req, res, next) {
  try {
    req.comensal = await leerComensal(req);
    next();
  } catch (err) {
    next(err);
  }
}

// Rutas que exigen cuenta (reservar, comentar, la propia cuenta).
async function exigirComensal(req, res, next) {
  try {
    const comensal = await leerComensal(req);
    if (!comensal) {
      return next(new UnauthorizedError('Necesitas una cuenta para hacer esto.', { codigo: 'CUENTA_REQUERIDA' }));
    }
    req.comensal = comensal;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { leerDispositivo, identificarComensal, exigirComensal };
