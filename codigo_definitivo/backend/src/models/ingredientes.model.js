const pool = require('../config/db');

// Acceso a `ingredientes` (insumos del restaurante, con stock y marca de alérgeno).

const listar = async (restauranteId, db = pool) => {
  const params = [];
  let sql = 'SELECT * FROM ingredientes WHERE 1=1';
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
  const [rows] = await db.query(`SELECT * FROM ingredientes WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

const crear = async ({ restaurante_id, nombre, costo_unitario, es_alergeno, stock_actual }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO ingredientes (restaurante_id, nombre, costo_unitario, es_alergeno, stock_actual) VALUES (?, ?, ?, ?, ?)',
    [restaurante_id, nombre, costo_unitario || 0, es_alergeno ? 1 : 0, stock_actual || 0]
  );
  return result.insertId;
};

const actualizar = async (
  id,
  { nombre, costo_unitario, es_alergeno, stock_actual },
  restauranteId = null,
  db = pool
) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE ingredientes SET nombre = COALESCE(?, nombre), costo_unitario = COALESCE(?, costo_unitario),
     es_alergeno = COALESCE(?, es_alergeno), stock_actual = COALESCE(?, stock_actual) WHERE id = ?${t.sql}`,
    [nombre, costo_unitario, es_alergeno === undefined ? null : es_alergeno ? 1 : 0, stock_actual, id, ...t.params]
  );
  return result.affectedRows;
};

// Ajuste atómico del stock: la propia condición SQL impide dejarlo en negativo,
// así que no hace falta leer-y-escribir (que sí tendría carrera).
const ajustarStock = async (id, delta, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE ingredientes SET stock_actual = stock_actual + ? WHERE id = ? AND stock_actual + ? >= 0${t.sql}`,
    [delta, id, delta, ...t.params]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM ingredientes WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

module.exports = { listar, buscarPorId, crear, actualizar, ajustarStock, eliminar };
