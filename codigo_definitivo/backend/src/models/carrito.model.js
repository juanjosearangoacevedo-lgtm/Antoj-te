const pool = require('../config/db');

// Acceso a `carritos`, `carrito_detalle` y `carrito_detalle_modificadores`.
// El carrito vive mientras el comensal pide: al hacer checkout se convierte en
// pedido y se borra, así que estas tablas son de corta vida.

const buscarPorMesaYSesion = async (mesaId, sesionToken, db = pool) => {
  const [rows] = await db.query('SELECT * FROM carritos WHERE mesa_id = ? AND sesion_token = ?', [
    mesaId,
    sesionToken,
  ]);
  return rows[0] || null;
};

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT * FROM carritos WHERE id = ?', [id]);
  return rows[0] || null;
};

// El id lo genera el service (uuid): la tabla no lo autogenera.
const crear = async ({ id, mesa_id, sesion_token }, db = pool) => {
  await db.query('INSERT INTO carritos (id, mesa_id, sesion_token) VALUES (?, ?, ?)', [
    id,
    mesa_id,
    sesion_token,
  ]);
  return id;
};

const eliminar = async (id, db = pool) => {
  const [result] = await db.query('DELETE FROM carritos WHERE id = ?', [id]);
  return result.affectedRows;
};

// Líneas del carrito con el precio base del plato o del combo que representan.
const detallesDeCarrito = async (carritoId, db = pool) => {
  const [rows] = await db.query(
    `SELECT cd.id, cd.plato_id, cd.combo_id, cd.cantidad, cd.notas_instrucciones,
            p.nombre AS plato_nombre, p.precio AS plato_precio,
            c.nombre AS combo_nombre, c.precio AS combo_precio
     FROM carrito_detalle cd
     LEFT JOIN platos p ON p.id = cd.plato_id
     LEFT JOIN combos c ON c.id = cd.combo_id
     WHERE cd.carrito_id = ?`,
    [carritoId]
  );
  return rows;
};

const modificadoresDeDetalle = async (detalleId, db = pool) => {
  const [rows] = await db.query(
    `SELECT om.id, om.nombre, om.precio_adicional
     FROM carrito_detalle_modificadores cdm
     JOIN opciones_modificadores om ON om.id = cdm.opcion_modificador_id
     WHERE cdm.carrito_detalle_id = ?`,
    [detalleId]
  );
  return rows;
};

const crearDetalle = async (
  { carrito_id, plato_id, combo_id, cantidad, notas_instrucciones },
  db = pool
) => {
  const [result] = await db.query(
    'INSERT INTO carrito_detalle (carrito_id, plato_id, combo_id, cantidad, notas_instrucciones) VALUES (?, ?, ?, ?, ?)',
    [carrito_id, plato_id || null, combo_id || null, cantidad || 1, notas_instrucciones || null]
  );
  return result.insertId;
};

const agregarModificadores = async (detalleId, opcionIds, db = pool) => {
  if (!Array.isArray(opcionIds) || !opcionIds.length) return;
  const values = opcionIds.map((optId) => [detalleId, optId]);
  await db.query(
    'INSERT INTO carrito_detalle_modificadores (carrito_detalle_id, opcion_modificador_id) VALUES ?',
    [values]
  );
};

// El comensal es anónimo: lo único que lo identifica es su `sesion_token`. Sin este
// acotado, un id de línea correlativo bastaba para tocar el carrito del de al lado.
const acotarPorSesion = (sesionToken) => ({
  sql: ' AND carrito_id IN (SELECT id FROM carritos WHERE sesion_token = ?)',
  params: [sesionToken],
});

const actualizarDetalle = async (
  detalleId,
  { cantidad, notas_instrucciones },
  sesionToken,
  db = pool
) => {
  const t = acotarPorSesion(sesionToken);
  const [result] = await db.query(
    `UPDATE carrito_detalle SET cantidad = COALESCE(?, cantidad), notas_instrucciones = COALESCE(?, notas_instrucciones) WHERE id = ?${t.sql}`,
    [cantidad, notas_instrucciones, detalleId, ...t.params]
  );
  return result.affectedRows;
};

const eliminarDetalle = async (detalleId, sesionToken, db = pool) => {
  const t = acotarPorSesion(sesionToken);
  const [result] = await db.query(`DELETE FROM carrito_detalle WHERE id = ?${t.sql}`, [
    detalleId,
    ...t.params,
  ]);
  return result.affectedRows;
};

module.exports = {
  buscarPorMesaYSesion,
  buscarPorId,
  crear,
  eliminar,
  detallesDeCarrito,
  modificadoresDeDetalle,
  crearDetalle,
  agregarModificadores,
  actualizarDetalle,
  eliminarDetalle,
};
