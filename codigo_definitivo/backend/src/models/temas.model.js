const pool = require('../config/db');

// Acceso a `temas_restaurante` (personalización visual por restaurante).

// Columnas que el restaurante puede personalizar. Todo lo que no esté aquí se
// ignora. El catálogo con sus etiquetas y valores vive en el frontend
// (shared/tema/opciones.js); aquí solo importa qué columnas existen.
const CAMPOS = [
  // Colores y marca
  'color_primario',
  'color_fondo',
  'color_botones',
  'color_texto',
  'modo',
  // Tipografía e íconos
  'tipografia_titulos',
  'tipografia_cuerpo',
  'iconografia',
  // Distribución
  'layout_categorias',
  'preview_categoria',
  'altura_categoria',
  'espaciado',
  'mostrar_precio_feed',
  // Pantalla de bienvenida
  'llamar_mesero',
  'mensaje_bienvenida',
  'redes_sociales',
  // Tarjetas y bordes
  'estilo_tarjetas',
  'radio_esquinas',
  'sombras',
  'opacidad_overlay',
  // Botones
  'estilo_botones',
  'forma_botones',
  // Movimiento
  'animaciones',
  'velocidad_animacion',
  // --- Columnas heredadas ---
  // Se guardan y se devuelven, pero HOY NINGÚN componente del menú las
  // consume: quedaron de iteraciones anteriores. No se borran para no perder
  // datos ya guardados, pero tampoco se ofrecen en el panel. Antes de volver a
  // exponerlas hay que implementar quién las lee.
  'colores_categorias',
  'iconografia',
  'estilo_tarjetas',
  'banner_url',
  'portada_url',
  'videos_destacados',
  'orden_visual',
  'config_navegacion',
];

// Estas se guardan como JSON en MySQL: se serializan al escribir y se parsean al leer.
const CAMPOS_JSON = [
  'colores_categorias',
  'videos_destacados',
  'orden_visual',
  'config_navegacion',
  'redes_sociales',
];

function parsearJson(row) {
  if (!row) return row;
  for (const campo of CAMPOS_JSON) {
    if (typeof row[campo] === 'string') {
      try {
        row[campo] = JSON.parse(row[campo]);
      } catch {
        /* se deja tal cual */
      }
    }
  }
  return row;
}

// Deja solo los campos personalizables presentes en `datos`, ya serializados.
function normalizar(datos) {
  const valores = {};
  for (const campo of CAMPOS) {
    if (datos[campo] === undefined) continue;
    valores[campo] = CAMPOS_JSON.includes(campo)
      ? datos[campo] === null
        ? null
        : JSON.stringify(datos[campo])
      : datos[campo];
  }
  return valores;
}

const buscarPorRestaurante = async (restauranteId, db = pool) => {
  const [rows] = await db.query('SELECT * FROM temas_restaurante WHERE restaurante_id = ?', [
    restauranteId,
  ]);
  return parsearJson(rows[0]) || null;
};

const actualizar = async (restauranteId, valores, db = pool) => {
  const sets = Object.keys(valores)
    .map((c) => `${c} = ?`)
    .join(', ');
  const [result] = await db.query(`UPDATE temas_restaurante SET ${sets} WHERE restaurante_id = ?`, [
    ...Object.values(valores),
    restauranteId,
  ]);
  return result.affectedRows;
};

const crear = async (restauranteId, valores, db = pool) => {
  const columnas = ['restaurante_id', ...Object.keys(valores)];
  const marcas = columnas.map(() => '?').join(', ');
  const [result] = await db.query(
    `INSERT INTO temas_restaurante (${columnas.join(', ')}) VALUES (${marcas})`,
    [restauranteId, ...Object.values(valores)]
  );
  return result.insertId;
};

// Contexto público que resuelve el QR de una mesa: restaurante + mesa + sucursal.
const contextoPorTokenQr = async (token, db = pool) => {
  const [rows] = await db.query(
    `SELECT r.id AS restaurante_id, r.nombre AS restaurante_nombre, r.logo_url, r.moneda, r.estado,
            m.id AS mesa_id, m.numero_mesa, s.id AS sucursal_id, s.nombre AS sucursal_nombre
     FROM mesas m
     JOIN sucursales s ON s.id = m.sucursal_id
     JOIN restaurantes r ON r.id = s.restaurante_id
     WHERE m.codigo_qr_token = ?`,
    [token]
  );
  return rows[0] || null;
};

// Contexto público que resuelve un SLUG: el mismo restaurante, pero sin mesa ni
// sucursal, porque quien llega por /r/ no está sentado en ninguna. Todo lo demás
// del menú funciona igual; lo que no hay es dónde entregar un pedido.
const contextoPorSlug = async (slug, db = pool) => {
  const [rows] = await db.query(
    `SELECT r.id AS restaurante_id, r.nombre AS restaurante_nombre, r.slug, r.descripcion,
            r.ciudad, r.logo_url, r.moneda, r.estado
     FROM restaurantes r WHERE r.slug = ?`,
    [slug]
  );
  return rows[0] || null;
};

module.exports = {
  buscarPorRestaurante,
  actualizar,
  crear,
  contextoPorTokenQr,
  contextoPorSlug,
  normalizar,
};
