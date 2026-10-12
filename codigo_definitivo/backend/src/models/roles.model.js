const pool = require('../config/db');

// Acceso a la tabla `roles`.
// Convención de todos los models: reciben `db` opcional para poder participar en
// una transacción (el service le pasa la conexión); por defecto usan el pool.
// Los models NO lanzan ApiError: devuelven filas, null o filas afectadas.

const listarTodos = async (db = pool) => {
  const [rows] = await db.query('SELECT * FROM roles ORDER BY id');
  return rows;
};

// Lo usa usuarios.service para saber QUE rol esconde un role_id antes de
// asignarlo: el id por si solo no dice nada, y hay que distinguir 'superadmin'
// del resto para no dejar que un admin de restaurante se corone.
const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT id, nombre_rol FROM roles WHERE id = ?', [id]);
  return rows[0] || null;
};

// Por nombre y no por id: el rol que recibe el dueño al aprobarle la cuenta es
// siempre 'admin_restaurante', y su id cambia según cómo se sembrara la base.
const buscarPorNombre = async (nombre, db = pool) => {
  const [rows] = await db.query('SELECT id, nombre_rol FROM roles WHERE nombre_rol = ?', [nombre]);
  return rows[0] || null;
};

module.exports = { listarTodos, buscarPorId, buscarPorNombre };
