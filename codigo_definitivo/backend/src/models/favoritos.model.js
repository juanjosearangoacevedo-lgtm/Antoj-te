const pool = require('../config/db');

// Acceso a `favoritos`. La sesión del comensal es anónima: se identifica por
// `sesion_token`, y cada favorito apunta a un plato O a un combo (nunca a ambos).
//
// Desde 2026-09-15_saneo_esquema.sql la tabla tiene UNIQUE (sesion_token,
// plato_k, combo_k), donde plato_k y combo_k son columnas generadas que valen
// COALESCE(id, 0) —en MySQL un UNIQUE con columnas NULL no impide duplicados—.
// Ese índice es lo que permite que marcar y desmarcar sean dos consultas
// sueltas y atómicas, sin el SELECT previo que antes dejaba una carrera.
//
// Las consultas de abajo escriben COALESCE(plato_id, 0) en vez de plato_k a
// propósito: MySQL resuelve esa expresión al índice de la columna generada
// igual de bien, y así este archivo funciona también en una base a la que
// todavía no se le haya aplicado la migración. Con dos entornos que se migran a
// mano, el orden del despliegue no debería poder romper el menú.

// INSERT IGNORE: si la fila ya existe, el índice único la rechaza, y aquí eso
// no es un error sino la respuesta ("ya estaba marcado").
const crear = async ({ sesion_token, plato_id, combo_id }, db = pool) => {
  const [result] = await db.query(
    'INSERT IGNORE INTO favoritos (sesion_token, plato_id, combo_id) VALUES (?, ?, ?)',
    [sesion_token, plato_id || null, combo_id || null]
  );
  return result.affectedRows;
};

// Borra por clave natural y no por id, para no tener que leer antes cuál era.
// 0 filas afectadas significa que no estaba marcado.
const eliminarPorClave = async ({ sesion_token, plato_id, combo_id }, db = pool) => {
  const [result] = await db.query(
    `DELETE FROM favoritos
      WHERE sesion_token = ?
        AND COALESCE(plato_id, 0) = ?
        AND COALESCE(combo_id, 0) = ?`,
    [sesion_token, plato_id || 0, combo_id || 0]
  );
  return result.affectedRows;
};

const listarPorSesion = async (sesionToken, db = pool) => {
  const [rows] = await db.query(
    `SELECT f.id, f.plato_id, f.combo_id, p.nombre AS plato_nombre, c.nombre AS combo_nombre
     FROM favoritos f
     LEFT JOIN platos p ON p.id = f.plato_id
     LEFT JOIN combos c ON c.id = f.combo_id
     WHERE f.sesion_token = ?`,
    [sesionToken]
  );
  return rows;
};

module.exports = { crear, eliminarPorClave, listarPorSesion };
