const pool = require('../config/db');

// Acceso a los datos que necesita la autenticación: credenciales y suscripción.

const buscarUsuarioPorEmail = async (email, db = pool) => {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.email, u.password_hash, u.restaurante_id, u.role_id, u.sesion_version,
            r.nombre_rol
     FROM usuarios u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

// Solo el hash, y por id: es lo que necesita el cambio de contraseña propia,
// donde el usuario ya viene identificado por su token.
const passwordPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT id, password_hash FROM usuarios WHERE id = ?', [id]);
  return rows[0] || null;
};

const guardarPassword = async (id, password_hash, db = pool) => {
  const [result] = await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [
    password_hash,
    id,
  ]);
  return result.affectedRows;
};

// Suscripción vigente del restaurante: prioriza la activa y, entre varias, la más reciente.
//
// Las comparaciones con "ahora" las hace MySQL y no Node: la fecha de fin se
// guarda con la hora de la base, y compararla con el reloj del proceso mezclaría
// dos zonas horarias. `pasada` es al segundo (vencer "ahora" corta al instante);
// `dias_restantes` es por días de calendario, para los avisos.
// `diasGracia` llega de fuera para que el número viva en un solo sitio
// (services/suscripciones.service.js).
const suscripcionVigente = async (restauranteId, diasGracia = 7, db = pool) => {
  const [rows] = await db.query(
    `SELECT estado, fecha_fin,
            DATEDIFF(fecha_fin, CURDATE()) AS dias_restantes,
            fecha_fin < NOW() AS pasada,
            DATE_ADD(fecha_fin, INTERVAL ? DAY) AS gracia_hasta,
            DATE_ADD(fecha_fin, INTERVAL ? DAY) < NOW() AS gracia_agotada
     FROM suscripciones WHERE restaurante_id = ?
     ORDER BY (estado = 'activa') DESC, fecha_inicio DESC LIMIT 1`,
    [diasGracia, diasGracia, restauranteId]
  );
  return rows[0] || null;
};

// Versión de sesión vigente del usuario. null = el usuario ya no existe.
const versionSesion = async (id, db = pool) => {
  const [rows] = await db.query('SELECT sesion_version FROM usuarios WHERE id = ?', [id]);
  return rows[0] ? Number(rows[0].sesion_version) : null;
};

// Sube la versión: todos los tokens emitidos hasta ahora dejan de valer.
const subirVersionSesion = async (id, db = pool) => {
  await db.query('UPDATE usuarios SET sesion_version = sesion_version + 1 WHERE id = ?', [id]);
};

module.exports = {
  buscarUsuarioPorEmail,
  passwordPorId,
  guardarPassword,
  suscripcionVigente,
  versionSesion,
  subirVersionSesion,
};
