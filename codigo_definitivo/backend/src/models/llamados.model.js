const pool = require('../config/db');

// Acceso a `llamados_mesero`: las peticiones de atención hechas desde una mesa.
// Como manda la arquitectura, aquí no se lanza ApiError ni se decide nada: se
// devuelve fila, null o filas afectadas, y el service traduce.

// El comensal no manda su mesa_id: manda el token del QR, que es lo único que
// tiene. Esta consulta lo resuelve y de paso trae el estado del restaurante,
// porque un restaurante suspendido no debe poder llamar a nadie.
const mesaPorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id AS mesa_id, m.numero_mesa, s.restaurante_id, r.estado
       FROM mesas m
       JOIN sucursales s ON s.id = m.sucursal_id
       JOIN restaurantes r ON r.id = s.restaurante_id
      WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0] || null;
};

const crear = async ({ mesa_id, sesion_token, motivo }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO llamados_mesero (mesa_id, sesion_token, motivo) VALUES (?, ?, ?)',
    [mesa_id, sesion_token || null, motivo]
  );
  return result.insertId;
};

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT * FROM llamados_mesero WHERE id = ?', [id]);
  return rows[0] || null;
};

// El llamado pendiente de una mesa, si lo hay. Sirve para responderle al
// comensal "ya avisamos" en vez de un error, cuando el UNIQUE rechaza el
// segundo toque.
const pendienteDeMesa = async (mesaId, db = pool) => {
  const [rows] = await db.query(
    "SELECT * FROM llamados_mesero WHERE mesa_id = ? AND estado = 'pendiente'",
    [mesaId]
  );
  return rows[0] || null;
};

// Lo que pinta el panel de cocina: pendientes del restaurante, más antiguos
// primero (son los que llevan más rato esperando).
const listarPendientes = async (restauranteId, { sucursal_id } = {}, db = pool) => {
  const params = [];
  let sql = `SELECT l.id, l.motivo, l.creado_en, m.numero_mesa, s.id AS sucursal_id, s.nombre AS sucursal_nombre
               FROM llamados_mesero l
               JOIN mesas m ON m.id = l.mesa_id
               JOIN sucursales s ON s.id = m.sucursal_id
              WHERE l.estado = 'pendiente'`;
  if (restauranteId) {
    sql += ' AND s.restaurante_id = ?';
    params.push(restauranteId);
  }
  if (sucursal_id) {
    sql += ' AND s.id = ?';
    params.push(sucursal_id);
  }
  const [rows] = await db.query(sql + ' ORDER BY l.creado_en ASC', params);
  return rows;
};

// La condición `estado = 'pendiente'` va en el WHERE, no en una lectura previa:
// así dos meseros que toquen "Atendido" a la vez no se pisan y el segundo
// recibe 0 filas en vez de sobrescribir quién lo atendió.
const atender = async (id, usuarioId, db = pool) => {
  const [result] = await db.query(
    `UPDATE llamados_mesero
        SET estado = 'atendido', atendido_en = NOW(), atendido_por = ?
      WHERE id = ? AND estado = 'pendiente'`,
    [usuarioId || null, id]
  );
  return result.affectedRows;
};

// A qué restaurante pertenece un llamado. El controller lo necesita para que un
// admin no pueda atender llamados de otro restaurante.
const restauranteDeLlamado = async (id, db = pool) => {
  const [rows] = await db.query(
    `SELECT s.restaurante_id
       FROM llamados_mesero l
       JOIN mesas m ON m.id = l.mesa_id
       JOIN sucursales s ON s.id = m.sucursal_id
      WHERE l.id = ?`,
    [id]
  );
  return rows[0]?.restaurante_id ?? null;
};

module.exports = {
  mesaPorTokenQr,
  crear,
  buscarPorId,
  pendienteDeMesa,
  listarPendientes,
  atender,
  restauranteDeLlamado,
};
