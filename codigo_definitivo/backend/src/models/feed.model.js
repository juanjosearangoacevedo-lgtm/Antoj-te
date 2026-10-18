const pool = require('../config/db');
const { RECOMENDADO_VIGENTE } = require('./platos.model');

// El catálogo del feed de la app: todos los platos que hoy se pueden enseñar,
// con su restaurante. Es UNA consulta por minuto (el service la guarda en
// caché), no una por página: filtrar, intercalar y paginar se hace en memoria
// sobre esta lista (ver services/feed/orden.js).
//
// Un plato entra si:
//   · está activo, su categoría también y su video ya está listo en Bunny;
//   · el restaurante lo deja en la app (`en_feed`) y tiene fecha de publicación;
//   · el restaurante está 'activo', tiene slug (sin él no hay enlace que
//     compartir) y su plan incluye 'app_publica'.

const elegibles = async (db = pool) => {
  // La hora de la base y no la de Node: `publicado_en` la escribe MySQL, y en
  // local MySQL va en hora de Colombia mientras el proceso puede ir en otra.
  const [[{ ahora }]] = await db.query('SELECT NOW() AS ahora');
  const [platos] = await db.query(
    `SELECT p.id, p.nombre, p.descripcion, p.precio, p.video_url, p.video_thumbnail_url, p.imagen_url,
            p.nivel_picante, p.duracion_segundos, p.publicado_en,
            ${RECOMENDADO_VIGENTE} AS recomendado_chef,
            c.nombre AS categoria,
            r.id AS restaurante_id, r.slug AS restaurante_slug, r.nombre AS restaurante_nombre,
            r.ciudad AS restaurante_ciudad, r.descripcion AS restaurante_descripcion,
            r.logo_url AS restaurante_logo, r.moneda
       FROM platos p
       JOIN categorias c ON c.id = p.categoria_id
       JOIN restaurantes r ON r.id = c.restaurante_id
       JOIN plan_features pf ON pf.plan_id = r.plan_id AND pf.feature = 'app_publica'
      WHERE p.activo = 1 AND p.en_feed = 1 AND p.video_status = 'listo' AND p.publicado_en IS NOT NULL
        AND c.activo = 1 AND r.estado = 'activo' AND r.slug IS NOT NULL
      ORDER BY p.publicado_en DESC, p.id DESC`
  );
  return { ahora, platos };
};

module.exports = { elegibles };
