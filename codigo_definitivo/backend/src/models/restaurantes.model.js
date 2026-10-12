const pool = require('../config/db');

// Acceso a `restaurantes` y a su historial de `suscripciones`.

// `fecha_fin` y `vencida` son de la suscripción activa: el superadmin las ve en la
// tabla de restaurantes para saber quién está en prueba, por vencer o vencido.
const listar = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT r.*, p.nombre AS plan_nombre,
            (SELECT COUNT(*) FROM usuarios u WHERE u.restaurante_id = r.id) AS usuarios,
            (SELECT COUNT(*) FROM sucursales s WHERE s.restaurante_id = r.id) AS sucursales,
            (SELECT s.fecha_fin FROM suscripciones s
              WHERE s.restaurante_id = r.id AND s.estado = 'activa'
              ORDER BY s.fecha_inicio DESC LIMIT 1) AS fecha_fin,
            (SELECT s.fecha_fin < NOW() FROM suscripciones s
              WHERE s.restaurante_id = r.id AND s.estado = 'activa'
              ORDER BY s.fecha_inicio DESC LIMIT 1) AS vencida
     FROM restaurantes r LEFT JOIN planes p ON p.id = r.plan_id
     ORDER BY r.id`
  );
  return rows;
};

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT * FROM restaurantes WHERE id = ?', [id]);
  return rows[0] || null;
};

const buscarPorIdConPlan = async (id, db = pool) => {
  const [rows] = await db.query(
    'SELECT r.*, p.nombre AS plan_nombre FROM restaurantes r LEFT JOIN planes p ON p.id = r.plan_id WHERE r.id = ?',
    [id]
  );
  return rows[0] || null;
};

const crear = async ({ nombre, logo_url, plan_id, estado }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO restaurantes (nombre, logo_url, plan_id, estado) VALUES (?, ?, ?, ?)',
    [nombre, logo_url || null, plan_id, estado || 'pendiente']
  );
  return result.insertId;
};

const actualizar = async (
  id,
  { nombre, logo_url, plan_id, estado, moneda, slug, descripcion, ciudad },
  db = pool
) => {
  const [result] = await db.query(
    `UPDATE restaurantes SET nombre = COALESCE(?, nombre), logo_url = COALESCE(?, logo_url),
     plan_id = COALESCE(?, plan_id), estado = COALESCE(?, estado), moneda = COALESCE(?, moneda),
     slug = COALESCE(?, slug), descripcion = COALESCE(?, descripcion), ciudad = COALESCE(?, ciudad)
     WHERE id = ?`,
    [
      nombre,
      logo_url,
      plan_id ?? null,
      estado ?? null,
      moneda ?? null,
      slug ?? null,
      descripcion ?? null,
      ciudad ?? null,
      id,
    ]
  );
  return result.affectedRows;
};

const actualizarEstado = async (id, estado, db = pool) => {
  const [result] = await db.query('UPDATE restaurantes SET estado = ? WHERE id = ?', [estado, id]);
  return result.affectedRows;
};

const actualizarPlan = async (id, planId, db = pool) => {
  const [result] = await db.query('UPDATE restaurantes SET plan_id = ? WHERE id = ?', [planId, id]);
  return result.affectedRows;
};

const eliminar = async (id, db = pool) => {
  const [result] = await db.query('DELETE FROM restaurantes WHERE id = ?', [id]);
  return result.affectedRows;
};

// Los que tienen carta pública: activos, con slug y con al menos un plato
// publicado. Alimenta el directorio /restaurantes, el sitemap y llms.txt.
//
// El filtro por platos importa: mandar al buscador una carta vacía gasta el
// presupuesto de rastreo y deja páginas sin contenido, que es lo que hace que
// deje de volver.
//
// Las condiciones sobre los platos son EXACTAMENTE las de platos.model
// .feedPorRestaurante, incluida `video_status = 'listo'`. Antes faltaba esa
// última y las dos consultas podían discrepar: un restaurante cuyos videos
// siguieran en Bunny procesándose entraba al sitemap con una vitrina que se
// pintaba vacía. (Un plato sin video no se queda fuera: la columna nace en
// 'listo' y solo pasa a 'procesando' cuando se sube uno.)
//
// `platos` sale en la respuesta porque el directorio usa el número como puerta
// de calidad: una carta de dos platos no es una página que valga la pena
// ofrecerle a nadie.
//
// `actualizado_en` es lo último que cambió en la vitrina: el restaurante o
// cualquiera de sus platos publicados. Es el <lastmod> del sitemap. (Borrar un
// plato no lo mueve: la fila ya no está para contarlo. Es un hueco pequeño y
// preferible a inventar fechas.)
const listarPublicos = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT r.id, r.nombre, r.slug, r.ciudad, r.descripcion, r.logo_url,
            COUNT(p.id) AS platos,
            GREATEST(r.actualizado_en, MAX(p.actualizado_en)) AS actualizado_en
     FROM restaurantes r
     JOIN categorias c ON c.restaurante_id = r.id AND c.activo = 1
     JOIN platos p ON p.categoria_id = c.id AND p.activo = 1 AND p.video_status = 'listo'
     WHERE r.estado = 'activo' AND r.slug IS NOT NULL AND r.slug <> ''
     GROUP BY r.id, r.nombre, r.slug, r.ciudad, r.descripcion, r.logo_url, r.actualizado_en
     ORDER BY r.nombre`
  );
  return rows;
};

// --- Suscripciones (historial de planes del restaurante) ---

// `diasPrueba`: la cuenta nace con esa prueba gratis y vence sola. `fechaFin`:
// se copia una fecha que ya existía (al cambiar de plan no se regala ni se quita
// tiempo). Sin ninguno de los dos, NULL = sin vencimiento: solo lo usa quien lo
// pide explícitamente (cortesías, cuentas de demostración).
const crearSuscripcion = async (
  restauranteId,
  planId,
  db = pool,
  { diasPrueba = null, fechaFin = null } = {}
) => {
  const [result] = await db.query(
    `INSERT INTO suscripciones (restaurante_id, plan_id, fecha_fin)
     VALUES (?, ?, ${diasPrueba ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : '?'})`,
    [restauranteId, planId, diasPrueba || fechaFin]
  );
  return result.insertId;
};

// Fecha de fin de la suscripción activa (undefined si no hay ninguna activa).
const finSuscripcionActiva = async (restauranteId, db = pool) => {
  const [rows] = await db.query(
    `SELECT fecha_fin FROM suscripciones WHERE restaurante_id = ? AND estado = 'activa'
     ORDER BY fecha_inicio DESC LIMIT 1`,
    [restauranteId]
  );
  return rows.length ? rows[0].fecha_fin : undefined;
};

// --- Ajustes manuales del superadmin sobre la suscripción activa ---
// Todas devuelven cuántas filas tocaron: 0 = no había suscripción activa.

// Suma días desde la fecha de fin si aún no llegó, o desde hoy si ya pasó: sumar
// 5 días a una cuenta vencida hace 20 le da 5 días de verdad, no -15.
const sumarDiasSuscripcion = async (restauranteId, dias, db = pool) => {
  const [result] = await db.query(
    `UPDATE suscripciones
     SET fecha_fin = DATE_ADD(GREATEST(COALESCE(fecha_fin, NOW()), NOW()), INTERVAL ? DAY)
     WHERE restaurante_id = ? AND estado = 'activa'`,
    [dias, restauranteId]
  );
  return result.affectedRows;
};

// `fecha` en 'YYYY-MM-DD' (vence al final de ese día) o null = sin vencimiento.
const fijarFinSuscripcion = async (restauranteId, fecha, db = pool) => {
  const valor = fecha ? "TIMESTAMP(?, '23:59:59')" : 'NULL';
  const [result] = await db.query(
    `UPDATE suscripciones SET fecha_fin = ${valor}
     WHERE restaurante_id = ? AND estado = 'activa'`,
    fecha ? [fecha, restauranteId] : [restauranteId]
  );
  return result.affectedRows;
};

// Un segundo en el pasado y no NOW(): la comprobación es `fecha_fin < NOW()`, y
// con NOW() la cuenta seguiría abierta durante el resto de ese mismo segundo
// (comprobado: las peticiones inmediatas pasaban).
const vencerSuscripcionAhora = async (restauranteId, db = pool) => {
  const [result] = await db.query(
    "UPDATE suscripciones SET fecha_fin = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE restaurante_id = ? AND estado = 'activa'",
    [restauranteId]
  );
  return result.affectedRows;
};

// --- Estado 'vencido' del restaurante ---
// Se pone cuando se agota la gracia tras vencer. Todo el lado público ya trata
// cualquier estado distinto de 'activo' como "no disponible" (carta por QR,
// vitrina, directorio, llamados), así que basta con este cambio para apagarlo.

// Ids de restaurantes activos cuya suscripción venció hace más de `diasGracia`.
const idsConGraciaAgotada = async (diasGracia, db = pool) => {
  const [rows] = await db.query(
    `SELECT DISTINCT r.id FROM restaurantes r
     JOIN suscripciones s ON s.restaurante_id = r.id AND s.estado = 'activa'
     WHERE r.estado = 'activo' AND s.fecha_fin IS NOT NULL
       AND s.fecha_fin < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [diasGracia]
  );
  return rows.map((r) => r.id);
};

const marcarVencidos = async (ids, db = pool) => {
  if (!ids.length) return 0;
  const [result] = await db.query(
    "UPDATE restaurantes SET estado = 'vencido' WHERE estado = 'activo' AND id IN (?)",
    [ids]
  );
  return result.affectedRows;
};

// Al pagar o renovar: solo sale de 'vencido'. Un restaurante que el superadmin
// suspendió a mano sigue suspendido aunque pague: esa decisión no la deshace un pago.
const reactivarSiVencido = async (restauranteId, db = pool) => {
  const [result] = await db.query(
    "UPDATE restaurantes SET estado = 'activo' WHERE id = ? AND estado = 'vencido'",
    [restauranteId]
  );
  return result.affectedRows;
};

const cancelarSuscripcionesActivas = async (restauranteId, db = pool) => {
  const [result] = await db.query(
    `UPDATE suscripciones SET estado = 'cancelada', fecha_fin = NOW()
     WHERE restaurante_id = ? AND estado = 'activa'`,
    [restauranteId]
  );
  return result.affectedRows;
};

// Suma un periodo pagado a la suscripción activa. Se cuenta desde su fecha de
// fin si aún no ha llegado (quien paga antes no pierde los días que le quedan)
// y desde ahora si ya venció o si no tenía fecha (NULL = sin vencimiento, el
// caso de las cuentas dadas de alta a mano: al empezar a pagar pasan a vencer).
// Devuelve cuántas filas tocó: 0 = no había suscripción activa.
const extenderSuscripcionActiva = async (restauranteId, periodo, db = pool) => {
  const intervalo = periodo === 'anual' ? 'INTERVAL 1 YEAR' : 'INTERVAL 1 MONTH';
  const [result] = await db.query(
    `UPDATE suscripciones
     SET fecha_fin = DATE_ADD(GREATEST(COALESCE(fecha_fin, NOW()), NOW()), ${intervalo})
     WHERE restaurante_id = ? AND estado = 'activa'`,
    [restauranteId]
  );
  return result.affectedRows;
};

// Sin suscripción activa (se venció y alguien la marcó 'vencida', o nunca tuvo),
// el pago abre una nueva que empieza hoy.
const crearSuscripcionPagada = async (restauranteId, planId, periodo, db = pool) => {
  const intervalo = periodo === 'anual' ? 'INTERVAL 1 YEAR' : 'INTERVAL 1 MONTH';
  const [result] = await db.query(
    `INSERT INTO suscripciones (restaurante_id, plan_id, fecha_fin)
     VALUES (?, ?, DATE_ADD(NOW(), ${intervalo}))`,
    [restauranteId, planId]
  );
  return result.insertId;
};

module.exports = {
  finSuscripcionActiva,
  sumarDiasSuscripcion,
  fijarFinSuscripcion,
  vencerSuscripcionAhora,
  idsConGraciaAgotada,
  marcarVencidos,
  reactivarSiVencido,
  extenderSuscripcionActiva,
  crearSuscripcionPagada,
  listar,
  listarPublicos,
  buscarPorId,
  buscarPorIdConPlan,
  crear,
  actualizar,
  actualizarEstado,
  actualizarPlan,
  eliminar,
  crearSuscripcion,
  cancelarSuscripcionesActivas,
};
