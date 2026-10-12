const pool = require('../config/db');

// Acceso a `usuarios`. Nunca devuelve `password_hash` hacia afuera salvo en la
// consulta de login, que vive en auth.model.js.

const listar = async (restauranteId, db = pool) => {
  const params = [];
  let sql = `SELECT u.id, u.nombre, u.email, u.restaurante_id, u.role_id, r.nombre_rol, u.creado_en
             FROM usuarios u JOIN roles r ON r.id = u.role_id WHERE 1=1`;
  if (restauranteId) {
    sql += ' AND u.restaurante_id = ?';
    params.push(restauranteId);
  }
  const [rows] = await db.query(sql + ' ORDER BY u.id', params);
  return rows;
};

// Acota una operacion por :id a un solo tenant.
//
// `restauranteId` nulo significa "sin acotar", y SOLO lo usa el superadmin, que
// opera sobre toda la plataforma. Para cualquier otro rol el service pasa
// siempre su restaurante_id.
//
// Detalle que hace el trabajo pesado: los usuarios de plataforma (el propio
// superadmin) tienen restaurante_id NULL, y en SQL `NULL = 5` no es verdadero
// sino NULL. Asi que un admin de restaurante acotado a su tenant NO alcanza al
// superadmin ni con el id correcto. Ese era el agujero: sin esta clausula,
// `WHERE id = ?` dejaba que cualquier admin le cambiara la clave.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : { sql: ' AND restaurante_id = ?', params: [restauranteId] };

const buscarPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(
    `SELECT id, nombre, email, restaurante_id, role_id FROM usuarios WHERE id = ?${t.sql}`,
    [id, ...t.params]
  );
  return rows[0] || null;
};

const crear = async ({ nombre, email, password_hash, restaurante_id, role_id }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO usuarios (nombre, email, password_hash, restaurante_id, role_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, password_hash, restaurante_id, role_id]
  );
  return result.insertId;
};

// COALESCE: los campos que no vienen conservan su valor actual.
const actualizar = async (id, { nombre, email, role_id, password_hash }, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE usuarios SET nombre = COALESCE(?, nombre), email = COALESCE(?, email),
     role_id = COALESCE(?, role_id), password_hash = COALESCE(?, password_hash)
     WHERE id = ?${t.sql}`,
    [nombre, email, role_id, password_hash, id, ...t.params]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM usuarios WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

// El índice único de `email` es un detalle de MySQL: se reconoce aquí para que el
// service no tenga que saber códigos de error del motor.
const esEmailDuplicado = (err) => err?.code === 'ER_DUP_ENTRY';

// Solo el id: quien pregunta esto quiere saber SI el correo está tomado, no leer
// la cuenta ajena. Devolver la fila entera aquí sería filtrar de más.
const buscarPorEmail = async (email, db = pool) => {
  const [rows] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  return rows[0] || null;
};

module.exports = {
  listar,
  buscarPorId,
  buscarPorEmail,
  crear,
  actualizar,
  eliminar,
  esEmailDuplicado,
};
