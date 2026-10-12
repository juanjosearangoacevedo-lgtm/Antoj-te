const pool = require('../config/db');

// Acceso a `planes` y a su tabla hija `plan_features` (los feature flags del plan).

// El panel los ve todos; la landing solo los que están a la venta. En los dos
// casos manda `orden`, que es como el superadmin decide la columna de la izquierda.
const listar = async (db = pool) => {
  const [rows] = await db.query('SELECT * FROM planes ORDER BY orden, id');
  return rows;
};

const listarActivos = async (db = pool) => {
  const [rows] = await db.query('SELECT * FROM planes WHERE activo = 1 ORDER BY orden, id');
  return rows;
};

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT * FROM planes WHERE id = ?', [id]);
  return rows[0] || null;
};

const CAMPOS = [
  'nombre',
  'slug',
  'precio',
  'precio_anual',
  'descripcion',
  'limite_platos',
  'limite_usuarios',
  'orden',
  'destacado',
  'activo',
];

const crear = async (datos, db = pool) => {
  const [result] = await db.query(
    `INSERT INTO planes (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    [
      datos.nombre,
      datos.slug,
      datos.precio || 0,
      datos.precio_anual ?? null,
      datos.descripcion || null,
      datos.limite_platos ?? null,
      datos.limite_usuarios ?? null,
      datos.orden || 0,
      datos.destacado ? 1 : 0,
      datos.activo === undefined ? 1 : datos.activo ? 1 : 0,
    ]
  );
  return result.insertId;
};

// COALESCE en todo menos en los límites: ahí NULL significa "sin límite" y es un
// valor que el usuario tiene que poder poner, no la señal de "no lo mandó".
// Por eso el service los resuelve antes y aquí llegan ya decididos.
const actualizar = async (id, datos, { limitePlatos, limiteUsuarios }, db = pool) => {
  const [result] = await db.query(
    `UPDATE planes SET nombre = COALESCE(?, nombre), slug = COALESCE(?, slug),
     precio = COALESCE(?, precio), precio_anual = COALESCE(?, precio_anual),
     descripcion = COALESCE(?, descripcion), orden = COALESCE(?, orden),
     destacado = COALESCE(?, destacado), activo = COALESCE(?, activo),
     limite_platos = ?, limite_usuarios = ?
     WHERE id = ?`,
    [
      datos.nombre,
      datos.slug,
      datos.precio,
      datos.precio_anual,
      datos.descripcion,
      datos.orden,
      datos.destacado === undefined ? null : datos.destacado ? 1 : 0,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      limitePlatos,
      limiteUsuarios,
      id,
    ]
  );
  return result.affectedRows;
};

// El slug va en la URL y en el ancla de la landing: dos planes con el mismo
// romperían el enlace. La base lo impide con un índice único; esto da el mensaje.
const esSlugDuplicado = (err) => err?.code === 'ER_DUP_ENTRY';

const eliminar = async (id, db = pool) => {
  const [result] = await db.query('DELETE FROM planes WHERE id = ?', [id]);
  return result.affectedRows;
};

// Texto comercial del plan. Tabla aparte de `plan_features` a propósito: una cosa
// es lo que el middleware deja pasar y otra lo que se le promete al cliente.
const caracteristicasDePlan = async (planId, db = pool) => {
  const [rows] = await db.query(
    'SELECT texto FROM plan_caracteristicas WHERE plan_id = ? ORDER BY orden, id',
    [planId]
  );
  return rows.map((c) => c.texto);
};

const reemplazarCaracteristicas = async (planId, textos, db = pool) => {
  await db.query('DELETE FROM plan_caracteristicas WHERE plan_id = ?', [planId]);
  if (Array.isArray(textos) && textos.length) {
    const values = textos.map((t, i) => [planId, t, i + 1]);
    await db.query('INSERT INTO plan_caracteristicas (plan_id, texto, orden) VALUES ?', [values]);
  }
};

const featuresDePlan = async (planId, db = pool) => {
  const [rows] = await db.query('SELECT feature FROM plan_features WHERE plan_id = ?', [planId]);
  return rows.map((f) => f.feature);
};

const reemplazarFeatures = async (planId, features, db = pool) => {
  await db.query('DELETE FROM plan_features WHERE plan_id = ?', [planId]);
  if (Array.isArray(features) && features.length) {
    const values = features.map((f) => [planId, f]);
    await db.query('INSERT INTO plan_features (plan_id, feature) VALUES ?', [values]);
  }
};

// Cuántos restaurantes y suscripciones dependen del plan (bloquea el borrado).
const contarUsos = async (id, db = pool) => {
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM restaurantes WHERE plan_id = ?) AS restaurantes,
       (SELECT COUNT(*) FROM suscripciones WHERE plan_id = ?) AS suscripciones`,
    [id, id]
  );
  return row;
};

module.exports = {
  listar,
  listarActivos,
  buscarPorId,
  crear,
  actualizar,
  eliminar,
  esSlugDuplicado,
  featuresDePlan,
  reemplazarFeatures,
  caracteristicasDePlan,
  reemplazarCaracteristicas,
  contarUsos,
};
