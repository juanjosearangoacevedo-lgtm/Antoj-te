const pool = require('../config/db');

// Acceso a `pagos`: los intentos de pago de la suscripción por Wompi.

const crear = async (
  { restauranteId, planId, periodo, montoCentavos, moneda, referencia },
  db = pool
) => {
  const [result] = await db.query(
    `INSERT INTO pagos (restaurante_id, plan_id, periodo, monto_centavos, moneda, referencia)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [restauranteId, planId, periodo, montoCentavos, moneda, referencia]
  );
  return result.insertId;
};

// `bloquear` toma la fila con FOR UPDATE: el webhook y la vuelta del navegador
// pueden llegar a la vez con la misma transacción, y sin el candado los dos
// verían aplicado_en = NULL y sumarían el periodo dos veces. Solo tiene sentido
// dentro de una transacción (con `db` = una conexión, no el pool).
const buscarPorReferencia = async (referencia, db = pool, { bloquear = false } = {}) => {
  const [rows] = await db.query(
    `SELECT * FROM pagos WHERE referencia = ?${bloquear ? ' FOR UPDATE' : ''}`,
    [referencia]
  );
  return rows[0] || null;
};

// Acotado al restaurante: un admin no puede consultar la referencia de otro.
const buscarDeRestaurante = async (referencia, restauranteId, db = pool) => {
  const [rows] = await db.query('SELECT * FROM pagos WHERE referencia = ? AND restaurante_id = ?', [
    referencia,
    restauranteId,
  ]);
  return rows[0] || null;
};

const listarPorRestaurante = async (restauranteId, limite = 20, db = pool) => {
  const [rows] = await db.query(
    `SELECT pa.id, pa.periodo, pa.monto_centavos, pa.moneda, pa.referencia, pa.estado,
            pa.metodo, pa.aplicado_en, pa.creado_en, p.nombre AS plan_nombre
     FROM pagos pa LEFT JOIN planes p ON p.id = pa.plan_id
     WHERE pa.restaurante_id = ?
     ORDER BY pa.creado_en DESC, pa.id DESC
     LIMIT ?`,
    [restauranteId, limite]
  );
  return rows;
};

const actualizarResultado = async (id, { estado, transaccionId, metodo }, db = pool) => {
  await db.query(
    `UPDATE pagos SET estado = ?, wompi_transaccion_id = COALESCE(?, wompi_transaccion_id),
     metodo = COALESCE(?, metodo) WHERE id = ?`,
    [estado, transaccionId ?? null, metodo ?? null, id]
  );
};

const marcarAplicado = async (id, db = pool) => {
  await db.query('UPDATE pagos SET aplicado_en = NOW() WHERE id = ?', [id]);
};

module.exports = {
  crear,
  buscarPorReferencia,
  buscarDeRestaurante,
  listarPorRestaurante,
  actualizarResultado,
  marcarAplicado,
};
