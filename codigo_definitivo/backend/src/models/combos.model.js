const pool = require('../config/db');

// Acceso a `combos` y a su tabla hija `combo_items` (los platos que lo componen).

const listar = async (restauranteId, db = pool) => {
  const params = [];
  let sql = 'SELECT * FROM combos WHERE 1=1';
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
  const [rows] = await db.query(`SELECT * FROM combos WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

// ¿Este combo es de este restaurante y está publicado? Lo pregunta el carrito antes
// de aceptar una línea, para que un combo ajeno o despublicado no entre por API.
const disponibleEnRestaurante = async (comboId, restauranteId, db = pool) => {
  const [rows] = await db.query(
    'SELECT 1 FROM combos WHERE id = ? AND restaurante_id = ? AND activo = 1',
    [comboId, restauranteId]
  );
  return rows.length > 0;
};

const itemsDeCombo = async (comboId, db = pool) => {
  const [rows] = await db.query(
    `SELECT ci.plato_id, p.nombre, p.precio, ci.cantidad
     FROM combo_items ci JOIN platos p ON p.id = ci.plato_id WHERE ci.combo_id = ?`,
    [comboId]
  );
  return rows;
};

const crear = async ({ restaurante_id, nombre, descripcion, precio, video_url }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO combos (restaurante_id, nombre, descripcion, precio, video_url) VALUES (?, ?, ?, ?, ?)',
    [restaurante_id, nombre, descripcion || null, precio || 0, video_url || null]
  );
  return result.insertId;
};

const actualizar = async (
  id,
  { nombre, descripcion, precio, video_url, activo },
  restauranteId = null,
  db = pool
) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE combos SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
     precio = COALESCE(?, precio), video_url = COALESCE(?, video_url), activo = COALESCE(?, activo) WHERE id = ?${t.sql}`,
    [nombre, descripcion, precio, video_url, activo === undefined ? null : activo ? 1 : 0, id, ...t.params]
  );
  return result.affectedRows;
};

// Reemplaza la composición completa del combo.
const reemplazarItems = async (comboId, items, db = pool) => {
  await db.query('DELETE FROM combo_items WHERE combo_id = ?', [comboId]);
  if (Array.isArray(items) && items.length) {
    const values = items.map((i) => [comboId, i.plato_id, i.cantidad || 1]);
    await db.query('INSERT INTO combo_items (combo_id, plato_id, cantidad) VALUES ?', [values]);
  }
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM combos WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

module.exports = {
  listar,
  buscarPorId,
  disponibleEnRestaurante,
  itemsDeCombo,
  crear,
  actualizar,
  reemplazarItems,
  eliminar,
};
