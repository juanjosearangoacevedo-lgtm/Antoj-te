const pool = require('../config/db');

// Acceso a `analiticas_eventos_video` y a las consultas de reporte del staff.
// El filtro por restaurante es opcional: sin él, el superadmin ve toda la plataforma.
//
// Dos decisiones que afectan a TODAS las consultas de abajo:
//
// 1. Se cuenta `COUNT(DISTINCT sesion_token)`, no `COUNT(*)`. Un embudo tiene que
//    responder "cuánta gente", no "cuántos eventos": si alguien deja el video
//    sonando, `COUNT(*)` lo cuenta veinte veces y el embudo deja de ser un embudo.
//    Además hay 918 filas históricas grabadas cuando el bucle del feed disparaba
//    `video_complete` en cada vuelta, y esta forma de contar las neutraliza.
//
// 2. Los rangos de fecha se aplican con `creado_en >= ? AND creado_en < ?`, con el
//    límite superior EXCLUSIVO y ya desplazado un día por el service. Con BETWEEN,
//    "hasta el 31" se comía todo el día 31 salvo la medianoche exacta.

const registrarEvento = async (
  { sucursal_id, plato_id, combo_id, tipo_evento, tiempo_segundos, sesion_token },
  db = pool
) => {
  await db.query(
    `INSERT INTO analiticas_eventos_video (sucursal_id, plato_id, combo_id, tipo_evento, tiempo_segundos, sesion_token)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sucursal_id, plato_id || null, combo_id || null, tipo_evento, tiempo_segundos || null, sesion_token]
  );
};

// Acota los eventos al restaurante (vía su sucursal) y al rango pedido.
const filtroEventos = (restauranteId, { desde, hasta }) => {
  const params = [];
  let sql = '';
  if (restauranteId) {
    sql += ' AND s.restaurante_id = ?';
    params.push(restauranteId);
  }
  if (desde) {
    sql += ' AND a.creado_en >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND a.creado_en < ?';
    params.push(hasta);
  }
  return { sql, params };
};

// Igual que el anterior pero para `pedidos`, que llega al restaurante por mesa.
const filtroPedidos = (restauranteId, { desde, hasta }) => {
  const params = [];
  let sql = '';
  if (restauranteId) {
    sql += ' AND s.restaurante_id = ?';
    params.push(restauranteId);
  }
  if (desde) {
    sql += ' AND p.creado_en >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND p.creado_en < ?';
    params.push(hasta);
  }
  return { sql, params };
};

// Totales de sesión: visitas al menú y personas que llegaron a ver algún video.
const resumenEventos = async (restauranteId, rango, db = pool) => {
  const f = filtroEventos(restauranteId, rango);
  const [[row]] = await db.query(
    `SELECT
       COUNT(DISTINCT a.sesion_token) AS visitantes,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'menu_abierto' THEN a.sesion_token END) AS menus_abiertos,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'video_start' THEN a.sesion_token END) AS vieron_video,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'ver_ficha' THEN a.sesion_token END) AS abrieron_ficha,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'agrego_carrito' THEN a.sesion_token END) AS agregaron,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'compra_exitosa' THEN a.sesion_token END) AS compraron,
       COUNT(*) AS eventos_totales
     FROM analiticas_eventos_video a
     JOIN sucursales s ON s.id = a.sucursal_id
     WHERE 1=1${f.sql}`,
    f.params
  );
  return row;
};

// Totales de pedido: cuántos, cuánto y el ticket promedio. Los cancelados se
// excluyen del dinero: cobrarlos en el promedio infla un ingreso que no existió.
const resumenPedidos = async (restauranteId, rango, db = pool) => {
  const f = filtroPedidos(restauranteId, rango);
  const [[row]] = await db.query(
    `SELECT
       COUNT(*) AS pedidos,
       COUNT(CASE WHEN p.estado = 'Cancelado' THEN 1 END) AS cancelados,
       COALESCE(SUM(CASE WHEN p.estado <> 'Cancelado' THEN p.total END), 0) AS ingresos,
       COALESCE(AVG(CASE WHEN p.estado <> 'Cancelado' THEN p.total END), 0) AS ticket_promedio
     FROM pedidos p
     JOIN mesas m ON m.id = p.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE 1=1${f.sql}`,
    f.params
  );
  return row;
};

// Una fila POR PLATO de la carta, tenga eventos o no. El LEFT JOIN es lo que hace
// posible la pregunta "qué platos NO está viendo nadie": con el INNER JOIN de
// antes, un plato con cero visualizaciones simplemente no aparecía en el informe.
const rendimientoPorPlato = async (restauranteId, rango, db = pool) => {
  const params = [];
  let filtroEv = '';
  if (rango.desde) {
    filtroEv += ' AND a.creado_en >= ?';
    params.push(rango.desde);
  }
  if (rango.hasta) {
    filtroEv += ' AND a.creado_en < ?';
    params.push(rango.hasta);
  }

  let filtroRest = '';
  if (restauranteId) {
    filtroRest = ' AND c.restaurante_id = ?';
    params.push(restauranteId);
  }

  const [rows] = await db.query(
    `SELECT p.id AS plato_id, p.nombre, p.precio, p.activo, c.nombre AS categoria,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'video_start' THEN a.sesion_token END) AS vistas,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'video_complete' THEN a.sesion_token END) AS completados,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'ver_ficha' THEN a.sesion_token END) AS fichas,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'click_favorito' THEN a.sesion_token END) AS favoritos,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'agrego_carrito' THEN a.sesion_token END) AS agregados,
       COUNT(DISTINCT CASE WHEN a.tipo_evento = 'compra_exitosa' THEN a.sesion_token END) AS comprados,
       COALESCE(AVG(CASE WHEN a.tipo_evento = 'tiempo_visto' THEN a.tiempo_segundos END), 0) AS segundos_promedio
     FROM platos p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN analiticas_eventos_video a ON a.plato_id = p.id${filtroEv}
     WHERE 1=1${filtroRest}
     GROUP BY p.id, p.nombre, p.precio, p.activo, c.nombre
     ORDER BY vistas DESC, p.nombre ASC`,
    params
  );
  return rows;
};

// Unidades realmente vendidas, que salen del pedido y no del evento de cliente.
const unidadesVendidasPorPlato = async (restauranteId, rango, db = pool) => {
  const f = filtroPedidos(restauranteId, rango);
  const [rows] = await db.query(
    `SELECT dp.plato_id, COALESCE(SUM(dp.cantidad), 0) AS unidades,
            COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS ingresos
     FROM detalles_pedido dp
     JOIN pedidos p ON p.id = dp.pedido_id
     JOIN mesas m ON m.id = p.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE dp.plato_id IS NOT NULL AND p.estado <> 'Cancelado'${f.sql}
     GROUP BY dp.plato_id`,
    f.params
  );
  return rows;
};

// Actividad por hora del día y por día de la semana (convención DAYOFWEEK: 1=Dom).
// Sirve para responder "¿a qué hora conviene tener la cocina reforzada?".
const actividadPorHora = async (restauranteId, rango, db = pool) => {
  const f = filtroPedidos(restauranteId, rango);
  const [rows] = await db.query(
    `SELECT HOUR(p.creado_en) AS hora, COUNT(*) AS pedidos,
            COALESCE(SUM(CASE WHEN p.estado <> 'Cancelado' THEN p.total END), 0) AS ingresos
     FROM pedidos p
     JOIN mesas m ON m.id = p.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE 1=1${f.sql}
     GROUP BY HOUR(p.creado_en) ORDER BY hora`,
    f.params
  );
  return rows;
};

const actividadPorDia = async (restauranteId, rango, db = pool) => {
  const f = filtroPedidos(restauranteId, rango);
  const [rows] = await db.query(
    `SELECT DAYOFWEEK(p.creado_en) AS dia_semana, COUNT(*) AS pedidos,
            COALESCE(SUM(CASE WHEN p.estado <> 'Cancelado' THEN p.total END), 0) AS ingresos
     FROM pedidos p
     JOIN mesas m ON m.id = p.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE 1=1${f.sql}
     GROUP BY DAYOFWEEK(p.creado_en) ORDER BY dia_semana`,
    f.params
  );
  return rows;
};

// Minutos por pedido, del primer al último cambio de estado registrado
const minutosPorPedido = async (restauranteId, rango, db = pool) => {
  const f = filtroPedidos(restauranteId, rango);
  const [rows] = await db.query(
    `SELECT p.id AS pedido_id,
       TIMESTAMPDIFF(MINUTE, MIN(pte.fecha_hora), MAX(pte.fecha_hora)) AS minutos_totales
     FROM pedidos p
     JOIN pedido_tiempos_estados pte ON pte.pedido_id = p.id
     JOIN mesas m ON m.id = p.mesa_id
     JOIN sucursales s ON s.id = m.sucursal_id
     WHERE 1=1${f.sql}
     GROUP BY p.id`,
    f.params
  );
  return rows;
};

// --- Plataforma (superadmin) ---

// Uso real por restaurante: es lo que separa un cliente que estrenó el QR de uno
// que lo dejó en un cajón, y por tanto el que está a punto de irse.
const usoPorRestaurante = async (rango, db = pool) => {
  const f = filtroEventos(null, rango);
  const p = filtroPedidos(null, rango);
  const [rows] = await db.query(
    `SELECT r.id, r.nombre, r.estado, pl.nombre AS plan,
       (SELECT COUNT(DISTINCT a.sesion_token)
          FROM analiticas_eventos_video a
          JOIN sucursales s ON s.id = a.sucursal_id
         WHERE s.restaurante_id = r.id${f.sql}) AS visitantes,
       (SELECT COUNT(*)
          FROM pedidos p
          JOIN mesas m ON m.id = p.mesa_id
          JOIN sucursales s ON s.id = m.sucursal_id
         WHERE s.restaurante_id = r.id${p.sql}) AS pedidos
     FROM restaurantes r
     LEFT JOIN planes pl ON pl.id = r.plan_id
     ORDER BY visitantes DESC, pedidos DESC, r.nombre ASC`,
    [...f.params, ...p.params]
  );
  return rows;
};

// Altas de restaurantes por mes, para ver crecimiento.
const altasPorMes = async (meses, db = pool) => {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes, COUNT(*) AS altas
     FROM restaurantes
     WHERE creado_en >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY mes ORDER BY mes`,
    [meses]
  );
  return rows;
};

module.exports = {
  registrarEvento,
  resumenEventos,
  resumenPedidos,
  rendimientoPorPlato,
  unidadesVendidasPorPlato,
  actividadPorHora,
  actividadPorDia,
  minutosPorPedido,
  usoPorRestaurante,
  altasPorMes,
};
