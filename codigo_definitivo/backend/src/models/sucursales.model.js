const pool = require('../config/db');

// Acceso a `sucursales` (cada restaurante puede tener varias sedes).

const listar = async (restauranteId, db = pool) => {
  const params = [];
  let sql = 'SELECT * FROM sucursales WHERE 1=1';
  if (restauranteId) {
    sql += ' AND restaurante_id = ?';
    params.push(restauranteId);
  }
  const [rows] = await db.query(sql + ' ORDER BY id', params);
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
  const [rows] = await db.query(`SELECT * FROM sucursales WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

const crear = async ({ restaurante_id, nombre, direccion, telefono }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO sucursales (restaurante_id, nombre, direccion, telefono) VALUES (?, ?, ?, ?)',
    [restaurante_id, nombre, direccion || null, telefono || null]
  );
  return result.insertId;
};

const actualizar = async (id, { nombre, direccion, telefono }, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE sucursales SET nombre = COALESCE(?, nombre), direccion = COALESCE(?, direccion), telefono = COALESCE(?, telefono) WHERE id = ?${t.sql}`,
    [nombre, direccion, telefono, id, ...t.params]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM sucursales WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

module.exports = { listar, buscarPorId, crear, actualizar, eliminar };
