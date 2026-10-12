const pool = require('../config/db');

// Acceso a `platos` y sus tablas puente (`plato_ingredientes`, `plato_grupos_modificadores`).

// La recomendación del chef puede estar programada por días (convención DAYOFWEEK
// de MySQL: 1=Dom … 7=Sáb) y/o por franja horaria. Esta expresión resuelve si está
// VIGENTE ahora mismo, para que el feed del comensal no cambie de contrato.
const RECOMENDADO_VIGENTE = `(
   p.recomendado_chef = 1
   AND (p.recomendado_dias IS NULL OR p.recomendado_dias = '' OR FIND_IN_SET(DAYOFWEEK(NOW()), p.recomendado_dias) > 0)
   AND (p.recomendado_hora_inicio IS NULL OR p.recomendado_hora_fin IS NULL
        OR CURTIME() BETWEEN p.recomendado_hora_inicio AND p.recomendado_hora_fin)
 )`;

const listar = async (restauranteId, categoriaId, db = pool) => {
  const params = [];
  let sql = 'SELECT p.* FROM platos p JOIN categorias c ON c.id = p.categoria_id WHERE 1=1';
  if (restauranteId) {
    sql += ' AND c.restaurante_id = ?';
    params.push(restauranteId);
  }
  if (categoriaId) {
    sql += ' AND p.categoria_id = ?';
    params.push(categoriaId);
  }
  const [rows] = await db.query(sql + ' ORDER BY p.orden, p.id', params);
  return rows;
};

// El tenant de un plato no está en su fila: cuelga de la categoría. La subconsulta
// no toca `platos`, así que el mismo acotado sirve para SELECT, UPDATE y DELETE.
// `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ' AND categoria_id IN (SELECT id FROM categorias WHERE restaurante_id = ?)',
        params: [restauranteId],
      };

const buscarPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(`SELECT * FROM platos WHERE id = ?${t.sql}`, [id, ...t.params]);
  return rows[0] || null;
};

// Detalle para el comensal. El staff usa `buscarPorId`, que a propósito NO filtra
// nada de esto porque necesita ver también lo despublicado.
const buscarPublicoPorId = async (id, db = pool) => {
  const [rows] = await db.query(
    `SELECT p.* FROM platos p
     JOIN categorias c ON c.id = p.categoria_id
     JOIN restaurantes r ON r.id = c.restaurante_id
     WHERE p.id = ? AND p.activo = 1 AND c.activo = 1 AND r.estado = 'activo'`,
    [id]
  );
  return rows[0] || null;
};

// ¿Este plato es de este restaurante y está publicado? Lo pregunta el carrito antes
// de aceptar una línea, para que un plato ajeno o despublicado no entre por API.
const disponibleEnRestaurante = async (platoId, restauranteId, db = pool) => {
  const [rows] = await db.query(
    `SELECT 1 FROM platos p JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = ? AND c.restaurante_id = ? AND p.activo = 1 AND c.activo = 1`,
    [platoId, restauranteId]
  );
  return rows.length > 0;
};

const ingredientesDePlato = async (platoId, db = pool) => {
  const [rows] = await db.query(
    `SELECT i.id, i.nombre, i.es_alergeno, pi.cantidad_usada
     FROM plato_ingredientes pi JOIN ingredientes i ON i.id = pi.ingrediente_id
     WHERE pi.plato_id = ?`,
    [platoId]
  );
  return rows;
};

const gruposModificadoresDePlato = async (platoId, db = pool) => {
  const [rows] = await db.query(
    `SELECT g.id, g.nombre, g.min_seleccion, g.max_seleccion, g.es_obligatorio
     FROM plato_grupos_modificadores pgm JOIN grupos_modificadores g ON g.id = pgm.grupo_id
     WHERE pgm.plato_id = ?`,
    [platoId]
  );
  return rows;
};

const opcionesDeGrupo = async (grupoId, db = pool) => {
  const [rows] = await db.query(
    'SELECT id, nombre, precio_adicional FROM opciones_modificadores WHERE grupo_id = ?',
    [grupoId]
  );
  return rows;
};

const crear = async (datos, db = pool) => {
  const [result] = await db.query(
    `INSERT INTO platos (categoria_id, nombre, descripcion, precio, video_url, video_guid, video_thumbnail_url, video_status, imagen_url, orden, nivel_picante, recomendado_chef, recomendado_dias, recomendado_hora_inicio, recomendado_hora_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.categoria_id,
      datos.nombre,
      datos.descripcion || null,
      datos.precio || 0,
      datos.video_url,
      datos.video_guid || null,
      datos.video_thumbnail_url || null,
      datos.video_status || 'listo',
      datos.imagen_url || null,
      datos.orden || 0,
      datos.nivel_picante || 0,
      datos.recomendado_chef ? 1 : 0,
      datos.recomendado_dias || null,
      datos.recomendado_hora_inicio || null,
      datos.recomendado_hora_fin || null,
    ]
  );
  return result.insertId;
};

// Solo los campos de programación del chef: se necesitan antes de actualizar para
// poder conservarlos en una actualización parcial.
const programacionChef = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [rows] = await db.query(
    `SELECT video_guid, recomendado_dias, recomendado_hora_inicio, recomendado_hora_fin FROM platos WHERE id = ?${t.sql}`,
    [id, ...t.params]
  );
  return rows[0] || null;
};

// `dias`, `horaInicio` y `horaFin` llegan ya resueltos por el service: aquí no se
// usa COALESCE con ellos, justamente para que se puedan limpiar (poner NULL).
const actualizar = async (id, datos, { dias, horaInicio, horaFin }, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(
    `UPDATE platos SET categoria_id = COALESCE(?, categoria_id), nombre = COALESCE(?, nombre),
     descripcion = COALESCE(?, descripcion), precio = COALESCE(?, precio), video_url = COALESCE(?, video_url),
     video_guid = COALESCE(?, video_guid), video_thumbnail_url = COALESCE(?, video_thumbnail_url),
     video_status = COALESCE(?, video_status), imagen_url = COALESCE(?, imagen_url), orden = COALESCE(?, orden),
     nivel_picante = COALESCE(?, nivel_picante), recomendado_chef = COALESCE(?, recomendado_chef),
     recomendado_dias = ?, recomendado_hora_inicio = ?, recomendado_hora_fin = ?,
     activo = COALESCE(?, activo) WHERE id = ?${t.sql}`,
    [
      datos.categoria_id,
      datos.nombre,
      datos.descripcion,
      datos.precio,
      datos.video_url,
      datos.video_guid,
      datos.video_thumbnail_url,
      datos.video_status,
      datos.imagen_url,
      datos.orden,
      datos.nivel_picante,
      datos.recomendado_chef === undefined ? null : datos.recomendado_chef ? 1 : 0,
      dias,
      horaInicio,
      horaFin,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
      ...t.params,
    ]
  );
  return result.affectedRows;
};

const eliminar = async (id, restauranteId = null, db = pool) => {
  const t = acotar(restauranteId);
  const [result] = await db.query(`DELETE FROM platos WHERE id = ?${t.sql}`, [id, ...t.params]);
  return result.affectedRows;
};

const reemplazarIngredientes = async (platoId, ingredientes, db = pool) => {
  await db.query('DELETE FROM plato_ingredientes WHERE plato_id = ?', [platoId]);
  if (ingredientes.length) {
    const values = ingredientes.map((i) => [platoId, i.ingrediente_id, i.cantidad_usada]);
    await db.query(
      'INSERT INTO plato_ingredientes (plato_id, ingrediente_id, cantidad_usada) VALUES ?',
      [values]
    );
  }
};

const reemplazarGruposModificadores = async (platoId, grupoIds, db = pool) => {
  await db.query('DELETE FROM plato_grupos_modificadores WHERE plato_id = ?', [platoId]);
  if (grupoIds.length) {
    const values = grupoIds.map((gid) => [platoId, gid]);
    await db.query('INSERT INTO plato_grupos_modificadores (plato_id, grupo_id) VALUES ?', [values]);
  }
};

// Feed público: solo platos activos, de categorías activas y con el video listo.
// Los recomendados vigentes suben al principio de cada categoría.
const feedPorRestaurante = async (restauranteId, db = pool) => {
  const [rows] = await db.query(
    // creado_en viaja por el SEO: un VideoObject sin uploadDate lo descarta
    // Google, y es la fecha más cercana que hay a "cuándo se publicó el video".
    `SELECT p.id, p.nombre, p.descripcion, p.precio, p.video_url, p.video_thumbnail_url, p.imagen_url, p.nivel_picante,
            p.creado_en, ${RECOMENDADO_VIGENTE} AS recomendado_chef, c.nombre AS categoria
     FROM platos p JOIN categorias c ON c.id = p.categoria_id
     WHERE c.restaurante_id = ? AND p.activo = 1 AND c.activo = 1 AND p.video_status = 'listo'
     ORDER BY c.orden, c.id, ${RECOMENDADO_VIGENTE} DESC, p.orden, p.id`,
    [restauranteId]
  );
  return rows;
};

// Estado del restaurante, resuelto desde su slug público. El equivalente del de
// abajo para quien llega por /r/ y no por el QR de una mesa.
const restaurantePorSlug = async (slug, db = pool) => {
  const [rows] = await db.query(
    'SELECT id AS restaurante_id, estado FROM restaurantes WHERE slug = ?',
    [slug]
  );
  return rows[0] || null;
};

// Estado del restaurante dueño de la mesa, resuelto desde el token del QR.
const restaurantePorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT s.restaurante_id, r.estado FROM mesas m
     JOIN sucursales s ON s.id = m.sucursal_id
     JOIN restaurantes r ON r.id = s.restaurante_id
     WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0] || null;
};

// Colección de Bunny del restaurante (se crea la primera vez que sube un video).
const coleccionBunny = async (restauranteId, db = pool) => {
  const [rows] = await db.query(
    'SELECT nombre, bunny_collection_id FROM restaurantes WHERE id = ?',
    [restauranteId]
  );
  return rows[0] || null;
};

const guardarColeccionBunny = async (restauranteId, collectionId, db = pool) => {
  await db.query('UPDATE restaurantes SET bunny_collection_id = ? WHERE id = ?', [
    collectionId,
    restauranteId,
  ]);
};

module.exports = {
  listar,
  buscarPorId,
  buscarPublicoPorId,
  disponibleEnRestaurante,
  ingredientesDePlato,
  gruposModificadoresDePlato,
  opcionesDeGrupo,
  crear,
  programacionChef,
  actualizar,
  eliminar,
  reemplazarIngredientes,
  reemplazarGruposModificadores,
  feedPorRestaurante,
  restaurantePorSlug,
  restaurantePorTokenQr,
  coleccionBunny,
  guardarColeccionBunny,
};
