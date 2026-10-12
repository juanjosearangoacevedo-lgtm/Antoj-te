const authModel = require('../models/auth.model');

// Revocación de sesiones.
//
// Cada JWT lleva `sv`, la versión de sesión del usuario cuando se emitió. Un
// token vale solo si su `sv` coincide con la versión que hay hoy en la base.
// Cambiar la contraseña, restablecerla o cambiar el rol sube la versión (ver
// `revocar`), y borrar al usuario deja sin versión con la que comparar: en los
// dos casos el token deja de servir en la siguiente petición.
//
// Por qué hay caché: el tablero de cocina consulta cada 5 s por dispositivo, y
// sin ella cada petición del panel costaría una consulta extra a MySQL. La
// versión se recuerda 30 s; `revocar` la descarta al momento en este proceso,
// así que el corte es inmediato para lo que se hace desde el panel. Lo único que
// puede tardar esos 30 s es un cambio hecho por fuera (a mano en la base).

const TTL_MS = 30 * 1000;
const cache = new Map(); // usuarioId -> { version, vence }

// Los ids llegan como número desde el token y como texto desde req.params: se
// normalizan para que los dos caminos toquen la misma entrada de la caché.
const clave = (usuarioId) => Number(usuarioId);

async function versionActual(usuarioId) {
  const guardada = cache.get(clave(usuarioId));
  if (guardada && guardada.vence > Date.now()) return guardada.version;

  const version = await authModel.versionSesion(usuarioId);
  cache.set(clave(usuarioId), { version, vence: Date.now() + TTL_MS });
  return version;
}

// Los tokens emitidos antes de que existiera `sv` cuentan como versión 0, que es
// con la que nació la columna: el despliegue no le cierra la sesión a nadie.
async function vigente(payload) {
  const version = await versionActual(payload.id);
  if (version === null) return false; // el usuario ya no existe
  return (payload.sv ?? 0) === version;
}

// Invalida todas las sesiones abiertas del usuario. Acepta una conexión para ir
// dentro de la transacción de quien llama; en ese caso hay que llamar a
// `olvidar` DESPUÉS del commit, o otra petición podría volver a guardar en caché
// la versión vieja mientras la transacción sigue abierta.
async function revocar(usuarioId, db) {
  await authModel.subirVersionSesion(usuarioId, db);
  cache.delete(clave(usuarioId));
}

// Descarta lo recordado de un usuario (tras un commit, o tras borrarlo).
function olvidar(usuarioId) {
  cache.delete(clave(usuarioId));
}

module.exports = { vigente, revocar, olvidar, versionActual };
