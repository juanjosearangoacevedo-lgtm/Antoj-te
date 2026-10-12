const pool = require('../config/db');

// Acceso a `categorias` (secciones de la carta: Entradas, Platos Fuertes…).

const listar = async (restauranteId, db = pool) => {
  const params = [];
  let sql = 'SELECT * FROM categorias WHERE 1=1';
  if (restauranteId) {
    sql += ' AND restaurante_id = ?';
    params.push(restauranteId);
  }
  const [rows] = await db.query(sql + ' ORDER BY orden, id', params);
  return rows;
};

// `restauranteId` nulo significa "sin acotar", y SOLO lo usa el superadmin. Para
// cualquier otro rol el service pasa siempre su restaurante_id, de modo que un id
// ajeno no devuelve fila en vez de devolver la del vecino.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : { sql: ' AND restaurante_id = ?', params: [restauranteId] };

const buscarPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(`SELECT * FROM categorias WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

const crear = async ({ restaurante_id, nombre, orden }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO categorias (restaurante_id, nombre, orden) VALUES (?, ?, ?)',
    [restaurante_id, nombre, orden || 0]
  );
  return result.insertId;
};

const actualizar = async (id, { nombre, activo, orden }, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE categorias SET nombre = COALESCE(?, nombre), activo = COALESCE(?, activo), orden = COALESCE(?, orden) WHERE id = ?${t.sql}`,
    [nombre, activo === undefined ? null : activo ? 1 : 0, orden, id, ...t.params]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM categorias WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

module.exports = { listar, buscarPorId, crear, actualizar, eliminar };
