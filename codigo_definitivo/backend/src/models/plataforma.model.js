const pool = require('../config/db');

// Consultas agregadas de toda la plataforma (solo superadmin).

const conteoRestaurantes = async (db = pool) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(estado = 'activo') AS activos,
            SUM(estado = 'pendiente') AS pendientes,
            SUM(estado = 'suspendido') AS suspendidos
     FROM restaurantes`
  );
  return row;
};

const restaurantesPorPlan = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT p.id AS plan_id, p.nombre AS plan_nombre, p.precio, COUNT(r.id) AS restaurantes
     FROM planes p LEFT JOIN restaurantes r ON r.plan_id = p.id
     GROUP BY p.id, p.nombre, p.precio ORDER BY p.id`
  );
  return rows;
};

const conteoUsuarios = async (db = pool) => {
  const [[row]] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
  return row;
};

const resumenPedidos = async (db = pool) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(total), 0) AS ventas_totales,
            SUM(DATE(creado_en) = CURDATE()) AS hoy,
            SUM(creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS ultimos_30_dias
     FROM pedidos`
  );
  return row;
};

// MRR estimado: suma del precio del plan de cada restaurante activo
const mrrEstimado = async (db = pool) => {
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(p.precio), 0) AS mrr
     FROM restaurantes r JOIN planes p ON p.id = r.plan_id
     WHERE r.estado = 'activo'`
  );
  return Number(row.mrr);
};

const topRestaurantes30Dias = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT r.id, r.nombre, COUNT(pe.id) AS pedidos, COALESCE(SUM(pe.total), 0) AS ventas
     FROM restaurantes r
     JOIN sucursales s ON s.restaurante_id = r.id
     JOIN mesas m ON m.sucursal_id = s.id
     JOIN pedidos pe ON pe.mesa_id = m.id AND pe.creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY r.id, r.nombre
     ORDER BY pedidos DESC
     LIMIT 5`
  );
  return rows;
};

module.exports = {
  conteoRestaurantes,
  restaurantesPorPlan,
  conteoUsuarios,
  resumenPedidos,
  mrrEstimado,
  topRestaurantes30Dias,
};
