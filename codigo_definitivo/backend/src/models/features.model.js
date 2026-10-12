const pool = require('../config/db');

// Consultas que necesita el gating por plan (middlewares/features.js): resolver
// a qué restaurante pertenece algo y qué features tiene contratadas.

const planDeRestaurante = async (restauranteId, db = pool) => {
  const [rows] = await db.query(
    `SELECT r.id, r.estado, r.plan_id, p.nombre AS plan_nombre
     FROM restaurantes r LEFT JOIN planes p ON p.id = r.plan_id
     WHERE r.id = ?`,
    [restauranteId]
  );
  return rows[0] || null;
};

const featuresDePlan = async (planId, db = pool) => {
  const [rows] = await db.query('SELECT feature FROM plan_features WHERE plan_id = ?', [planId]);
  return rows.map((f) => f.feature);
};

// Desde el token del QR de una mesa.
const restauranteIdPorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT s.restaurante_id FROM mesas m JOIN sucursales s ON s.id = m.sucursal_id
     WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0]?.restaurante_id ?? null;
};

// Desde una línea de carrito (rutas /carrito/detalle/:detalleId).
// Este JOIN respondía 500 hasta que se unificó la collation de la base
// (migrations/2026-07-31_unificar_collation.sql): `carritos.id` y
// `carrito_detalle.carrito_id` tenían collations distintas y MySQL no puede
// compararlas. Si vuelve a aparecer ese error, la base se volvió a partir.
const restauranteIdPorDetalleCarrito = async (detalleId, db = pool) => {
  const [rows] = await db.query(
    `SELECT s.restaurante_id
     FROM carrito_detalle cd
     JOIN carritos c ON c.id = cd.carrito_id
     JOIN mesas m ON m.id = c.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE cd.id = ?`,
    [detalleId]
  );
  return rows[0]?.restaurante_id ?? null;
};

module.exports = {
  planDeRestaurante,
  featuresDePlan,
  restauranteIdPorTokenQr,
  restauranteIdPorDetalleCarrito,
};
