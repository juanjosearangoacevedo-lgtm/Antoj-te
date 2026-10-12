const pool = require('../config/db');

// Acceso a `mesas`. Cada mesa tiene un `codigo_qr_token` único: es lo que
// codifica el QR impreso y lo que identifica al comensal al escanear.

// El tenant de una mesa no está en su fila: cuelga de la sucursal. La subconsulta
// no toca `mesas`, así que el mismo acotado sirve para SELECT, UPDATE y DELETE.
// `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ' AND sucursal_id IN (SELECT id FROM sucursales WHERE restaurante_id = ?)',
        params: [restauranteId],
      };

const listarPorSucursal = async (sucursalId, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(
    `SELECT * FROM mesas WHERE sucursal_id = ?${t.sql} ORDER BY id`,
    [sucursalId, ...t.params]
  );
  return rows;
};

const buscarPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(`SELECT * FROM mesas WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

const crear = async ({ sucursal_id, numero_mesa, codigo_qr_token }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO mesas (sucursal_id, numero_mesa, codigo_qr_token) VALUES (?, ?, ?)',
    [sucursal_id, numero_mesa, codigo_qr_token]
  );
  return result.insertId;
};

const actualizar = async (id, { numero_mesa }, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE mesas SET numero_mesa = COALESCE(?, numero_mesa) WHERE id = ?${t.sql}`,
    [numero_mesa, id, ...t.params]
  );
  return result.affectedRows;
};

const actualizarTokenQr = async (id, token, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE mesas SET codigo_qr_token = ? WHERE id = ?${t.sql}`,
    [token, id, ...t.params]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM mesas WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

// Resuelve el QR a mesa + sucursal + restaurante, para abrir el menú del comensal.
const resolverPorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id AS mesa_id, m.numero_mesa, s.id AS sucursal_id, s.nombre AS sucursal_nombre,
            r.id AS restaurante_id, r.nombre AS restaurante_nombre, r.logo_url
     FROM mesas m
     JOIN sucursales s ON s.id = m.sucursal_id
     JOIN restaurantes r ON r.id = s.restaurante_id
     WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0] || null;
};

// Versión mínima que usa el carrito. Trae también el restaurante porque el carrito
// lo necesita para comprobar que cada plato que se agrega es de ESTA carta.
const buscarPorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id, m.sucursal_id, s.restaurante_id
     FROM mesas m JOIN sucursales s ON s.id = m.sucursal_id
     WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0] || null;
};

// `numero_mesa` es único por sucursal: este es el choque de ese índice.
const esNumeroDuplicado = (err) => err?.code === 'ER_DUP_ENTRY';

module.exports = {
  listarPorSucursal,
  buscarPorId,
  crear,
  actualizar,
  actualizarTokenQr,
  eliminar,
  resolverPorTokenQr,
  buscarPorTokenQr,
  esNumeroDuplicado,
};
