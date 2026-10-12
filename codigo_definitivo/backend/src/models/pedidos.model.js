const pool = require('../config/db');

// Acceso a `pedidos` y sus tablas asociadas: `detalles_pedido`,
// `pedido_detalle_modificadores` y `pedido_tiempos_estados` (bitácora de estados).

const listar = async (restauranteId, { estado, sucursal_id } = {}, db = pool) => {
  const params = [];
  let sql = `SELECT p.*, m.numero_mesa, s.id AS sucursal_id, s.nombre AS sucursal_nombre
             FROM pedidos p
             JOIN mesas m ON m.id = p.mesa_id
             JOIN sucursales s ON s.id = m.sucursal_id
             WHERE 1=1`;
  if (restauranteId) {
    sql += ' AND s.restaurante_id = ?';
    params.push(restauranteId);
  }
  if (estado) {
    sql += ' AND p.estado = ?';
    params.push(estado);
  }
  if (sucursal_id) {
    sql += ' AND s.id = ?';
    params.push(sucursal_id);
  }
  sql += ' ORDER BY p.creado_en ASC';
  const [rows] = await db.query(sql, params);
  return rows;
};

// El tenant de un pedido cuelga de la mesa, y esta de la sucursal. La subconsulta
// no toca `pedidos`, así que el mismo acotado sirve para SELECT y UPDATE.
// `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ` AND mesa_id IN (
                 SELECT m.id FROM mesas m JOIN sucursales s ON s.id = m.sucursal_id
                 WHERE s.restaurante_id = ?)`,
        params: [restauranteId],
      };

const buscarPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(`SELECT * FROM pedidos WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

const detallesDePedido = async (pedidoId, db = pool) => {
  const [rows] = await db.query(
    `SELECT dp.*, p.nombre AS plato_nombre, c.nombre AS combo_nombre
     FROM detalles_pedido dp
     LEFT JOIN platos p ON p.id = dp.plato_id
     LEFT JOIN combos c ON c.id = dp.combo_id
     WHERE dp.pedido_id = ?`,
    [pedidoId]
  );
  return rows;
};

const modificadoresDeDetalle = async (detalleId, db = pool) => {
  const [rows] = await db.query(
    `SELECT pdm.precio_cobrado, om.nombre
     FROM pedido_detalle_modificadores pdm
     JOIN opciones_modificadores om ON om.id = pdm.opcion_modificador_id
     WHERE pdm.detalle_pedido_id = ?`,
    [detalleId]
  );
  return rows;
};

const tiemposDePedido = async (pedidoId, db = pool) => {
  const [rows] = await db.query(
    'SELECT * FROM pedido_tiempos_estados WHERE pedido_id = ? ORDER BY fecha_hora',
    [pedidoId]
  );
  return rows;
};

const actualizarEstado = async (id, estado, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`UPDATE pedidos SET estado = ? WHERE id = ?${t.sql}`, [
    estado,
    id,
    ...t.params,
  ]);
  return result.affectedRows;
};

// Bitácora: cada cambio de estado queda registrado para medir tiempos de cocina.
const registrarCambioEstado = async (pedidoId, estado, db = pool) => {
  await db.query('INSERT INTO pedido_tiempos_estados (pedido_id, estado_cambiado) VALUES (?, ?)', [
    pedidoId,
    estado,
  ]);
};

const crear = async ({ mesa_id, sesion_token, estado, total, observaciones }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO pedidos (mesa_id, sesion_token, estado, total, observaciones) VALUES (?, ?, ?, ?, ?)',
    [mesa_id, sesion_token, estado, total, observaciones || null]
  );
  return result.insertId;
};

const crearDetalle = async ({ pedido_id, plato_id, combo_id, cantidad, precio_unitario }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO detalles_pedido (pedido_id, plato_id, combo_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
    [pedido_id, plato_id || null, combo_id || null, cantidad, precio_unitario]
  );
  return result.insertId;
};

const crearModificadorDeDetalle = async (
  { detalle_pedido_id, opcion_modificador_id, precio_cobrado },
  db = pool
) => {
  await db.query(
    'INSERT INTO pedido_detalle_modificadores (detalle_pedido_id, opcion_modificador_id, precio_cobrado) VALUES (?, ?, ?)',
    [detalle_pedido_id, opcion_modificador_id, precio_cobrado]
  );
};

// Publico: los pedidos de una sesión anónima del comensal.
const listarPorSesion = async (sesionToken, db = pool) => {
  const [rows] = await db.query(
    'SELECT * FROM pedidos WHERE sesion_token = ? ORDER BY creado_en DESC',
    [sesionToken]
  );
  return rows;
};

module.exports = {
  listar,
  buscarPorId,
  detallesDePedido,
  modificadoresDeDetalle,
  tiemposDePedido,
  actualizarEstado,
  registrarCambioEstado,
  crear,
  crearDetalle,
  crearModificadorDeDetalle,
  listarPorSesion,
};
