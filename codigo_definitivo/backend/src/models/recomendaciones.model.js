const pool = require('../config/db');

// Acceso a `recomendaciones_ia_productos`: pares de platos con su puntaje de afinidad.

const listarPorPlato = async (platoId, limite, db = pool) => {
  const [rows] = await db.query(
    `SELECT p.id, p.nombre, p.precio, p.video_url, r.puntaje_afinidad
     FROM recomendaciones_ia_productos r
     JOIN platos p ON p.id = r.producto_id_recomendado
     WHERE r.plato_id_origen = ? AND p.activo = 1
     ORDER BY r.puntaje_afinidad DESC
     LIMIT ?`,
    [platoId, limite]
  );
  return rows;
};

const upsert = async ({ plato_id_origen, producto_id_recomendado, puntaje_afinidad }, db = pool) => {
  await db.query(
    `INSERT INTO recomendaciones_ia_productos (plato_id_origen, producto_id_recomendado, puntaje_afinidad)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE puntaje_afinidad = VALUES(puntaje_afinidad)`,
    [plato_id_origen, producto_id_recomendado, puntaje_afinidad || 0]
  );
};

// El tenant de una recomendación cuelga del plato de origen, que a su vez cuelga
// de su categoría. `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ` AND plato_id_origen IN (
                 SELECT p.id FROM platos p JOIN categorias c ON c.id = p.categoria_id
                 WHERE c.restaurante_id = ?)`,
        params: [restauranteId],
      };

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `DELETE FROM recomendaciones_ia_productos WHERE id = ?${t.sql}`,
    [id, ...t.params]
  );
  return result.affectedRows;
};

module.exports = { listarPorPlato, upsert, eliminar };
