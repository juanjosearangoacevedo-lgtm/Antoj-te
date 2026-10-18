const pool = require('../config/db');

// La capa social de la app: "me gusta", guardados, comentarios, reportes y
// bloqueos.
//
// EL DUEÑO. Los "me gusta" y los guardados funcionan sin cuenta (decisión D6):
// pertenecen a un DUEÑO, que es el UUID del teléfono o, con sesión, 'c:<id del
// comensal>'. En `favoritos` el dueño va en `sesion_token` (la misma columna
// que usa el menú web con el UUID del navegador), y su índice único
// (sesion_token, plato_k, combo_k) garantiza un "me gusta" por dueño y plato.
// En `guardados` va en `dueno`, con su propio único. `comensal_id` repite la
// cuenta para que borrarla borre todo en cascada.

const sinIds = (ids) => !ids || ids.length === 0;

// --- Me gusta ---

const contarMeGusta = async (platoIds, db = pool) => {
  if (sinIds(platoIds)) return new Map();
  const [rows] = await db.query(
    'SELECT plato_id, COUNT(*) AS total FROM favoritos WHERE plato_id IN (?) GROUP BY plato_id',
    [platoIds]
  );
  return new Map(rows.map((r) => [Number(r.plato_id), Number(r.total)]));
};

const meGustaDe = async (dueno, platoIds, db = pool) => {
  if (!dueno || sinIds(platoIds)) return new Set();
  const [rows] = await db.query('SELECT plato_id FROM favoritos WHERE sesion_token = ? AND plato_id IN (?)', [
    dueno,
    platoIds,
  ]);
  return new Set(rows.map((r) => Number(r.plato_id)));
};

// INSERT IGNORE: si ya estaba marcado, el índice único rechaza la fila y eso es
// la respuesta, no un error. Dos toques simultáneos dejan una sola fila.
const marcarMeGusta = async ({ dueno, comensalId, platoId }, db = pool) => {
  await db.query('INSERT IGNORE INTO favoritos (sesion_token, comensal_id, plato_id) VALUES (?, ?, ?)', [
    dueno,
    comensalId ?? null,
    platoId,
  ]);
};

const quitarMeGusta = async ({ dueno, platoId }, db = pool) => {
  await db.query('DELETE FROM favoritos WHERE sesion_token = ? AND plato_id = ? AND combo_id IS NULL', [
    dueno,
    platoId,
  ]);
};

// --- Guardados ---

const guardadosDe = async (dueno, platoIds, db = pool) => {
  if (!dueno || sinIds(platoIds)) return new Set();
  const [rows] = await db.query('SELECT plato_id FROM guardados WHERE dueno = ? AND plato_id IN (?)', [dueno, platoIds]);
  return new Set(rows.map((r) => Number(r.plato_id)));
};

const guardar = async ({ dueno, comensalId, platoId }, db = pool) => {
  await db.query('INSERT IGNORE INTO guardados (dueno, comensal_id, plato_id) VALUES (?, ?, ?)', [
    dueno,
    comensalId ?? null,
    platoId,
  ]);
};

const quitarGuardado = async ({ dueno, platoId }, db = pool) => {
  await db.query('DELETE FROM guardados WHERE dueno = ? AND plato_id = ?', [dueno, platoId]);
};

// Lo más reciente primero. El tope evita que una lista enorme viaje entera: la
// pantalla de guardados no pagina todavía.
const listarGuardados = async (dueno, limite, db = pool) => {
  const [rows] = await db.query('SELECT plato_id FROM guardados WHERE dueno = ? ORDER BY id DESC LIMIT ?', [
    dueno,
    limite,
  ]);
  return rows.map((r) => Number(r.plato_id));
};

// --- Al entrar o registrarse, lo del teléfono pasa a la cuenta (D6) ---
//
// UPDATE IGNORE mueve las filas que no chocan; las que chocan son platos que la
// cuenta ya tenía marcados desde otro teléfono, y se borran: quedan una vez,
// del lado de la cuenta. Va en la transacción de quien llama.
const adoptarDispositivo = async ({ dispositivoId, comensalId }, db = pool) => {
  const cuenta = `c:${comensalId}`;
  await db.query(
    'UPDATE IGNORE favoritos SET sesion_token = ?, comensal_id = ? WHERE sesion_token = ? AND comensal_id IS NULL',
    [cuenta, comensalId, dispositivoId]
  );
  await db.query('DELETE FROM favoritos WHERE sesion_token = ? AND comensal_id IS NULL', [dispositivoId]);
  await db.query('UPDATE IGNORE guardados SET dueno = ?, comensal_id = ? WHERE dueno = ? AND comensal_id IS NULL', [
    cuenta,
    comensalId,
    dispositivoId,
  ]);
  await db.query('DELETE FROM guardados WHERE dueno = ? AND comensal_id IS NULL', [dispositivoId]);
};

// --- Comentarios ---

const contarComentarios = async (platoIds, db = pool) => {
  if (sinIds(platoIds)) return new Map();
  const [rows] = await db.query(
    "SELECT plato_id, COUNT(*) AS total FROM comentarios WHERE plato_id IN (?) AND estado = 'visible' GROUP BY plato_id",
    [platoIds]
  );
  return new Map(rows.map((r) => [Number(r.plato_id), Number(r.total)]));
};

// Lo que una persona con sesión no ve: los comentarios de quienes bloqueó y los
// que ella misma reportó (reportar uno lo saca de su vista al instante).
const ocultosPara = (comensalId) =>
  comensalId
    ? {
        sql: ` AND co.comensal_id NOT IN (SELECT bloqueado_id FROM comensal_bloqueos WHERE comensal_id = ?)
               AND co.id NOT IN (SELECT comentario_id FROM comentario_reportes WHERE comensal_id = ?)`,
        params: [comensalId, comensalId],
      }
    : { sql: '', params: [] };

/** Comentarios visibles de un plato para esa persona, del más nuevo al más viejo. */
// `hace_segundos` lo calcula MySQL contra su propio NOW(): la base local va en
// hora de Colombia y la de producción en UTC, y una fecha sin zona que viaje a
// un teléfono se leería en la hora del teléfono. La antigüedad no depende de eso.
const listarComentarios = async ({ platoId, antesDe, limite, comensalId }, db = pool) => {
  const params = [platoId];
  let sql = `SELECT co.id, co.texto, co.creado_en, co.comensal_id, cm.nombre AS autor_nombre,
                    TIMESTAMPDIFF(SECOND, co.creado_en, NOW()) AS hace_segundos
               FROM comentarios co
               JOIN comensales cm ON cm.id = co.comensal_id
              WHERE co.plato_id = ? AND co.estado = 'visible'`;
  if (antesDe) {
    sql += ' AND co.id < ?';
    params.push(antesDe);
  }
  const ocultos = ocultosPara(comensalId);
  sql += `${ocultos.sql} ORDER BY co.id DESC LIMIT ?`;
  params.push(...ocultos.params, limite);
  const [rows] = await db.query(sql, params);
  return rows;
};

/**
 * Cuántos comentarios de un plato ve esa persona: los mismos de
 * `listarComentarios`, para que el título de la pantalla cuadre con la lista.
 * El feed cuenta otra cosa, los visibles para todo el mundo (`contarComentarios`).
 */
const contarComentariosPara = async ({ platoId, comensalId }, db = pool) => {
  const ocultos = ocultosPara(comensalId);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM comentarios co WHERE co.plato_id = ? AND co.estado = 'visible'${ocultos.sql}`,
    [platoId, ...ocultos.params]
  );
  return Number(total);
};

const crearComentario = async ({ platoId, comensalId, texto }, db = pool) => {
  const [r] = await db.query('INSERT INTO comentarios (plato_id, comensal_id, texto) VALUES (?, ?, ?)', [
    platoId,
    comensalId,
    texto,
  ]);
  return r.insertId;
};

const buscarComentario = async (id, db = pool) => {
  const [rows] = await db.query(
    `SELECT co.id, co.plato_id, co.comensal_id, co.texto, co.estado, co.creado_en, cm.nombre AS autor_nombre,
            TIMESTAMPDIFF(SECOND, co.creado_en, NOW()) AS hace_segundos
       FROM comentarios co JOIN comensales cm ON cm.id = co.comensal_id
      WHERE co.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const eliminarComentarioPropio = async ({ id, comensalId }, db = pool) => {
  const [r] = await db.query('DELETE FROM comentarios WHERE id = ? AND comensal_id = ?', [id, comensalId]);
  return r.affectedRows;
};

const comentariosRecientes = async (comensalId, minutos, db = pool) => {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM comentarios WHERE comensal_id = ? AND creado_en > NOW() - INTERVAL ? MINUTE',
    [comensalId, minutos]
  );
  return Number(total);
};

// --- Reportes y bloqueos ---

// 0 filas = esa persona ya lo había reportado.
const reportar = async ({ comentarioId, comensalId, motivo, detalle }, db = pool) => {
  const [r] = await db.query(
    'INSERT IGNORE INTO comentario_reportes (comentario_id, comensal_id, motivo, detalle) VALUES (?, ?, ?, ?)',
    [comentarioId, comensalId, motivo, detalle ?? null]
  );
  return r.affectedRows;
};

const reportesPendientes = async (comentarioId, db = pool) => {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM comentario_reportes WHERE comentario_id = ? AND resuelto_en IS NULL',
    [comentarioId]
  );
  return Number(total);
};

// Oculta sin moderador: lo bajaron los reportes. El restaurante lo ve en su
// lista de moderación y decide si vuelve.
const ocultarPorReportes = async (comentarioId, db = pool) => {
  await db.query(
    "UPDATE comentarios SET estado = 'oculto', moderado_en = NOW(), moderado_por = NULL WHERE id = ? AND estado = 'visible'",
    [comentarioId]
  );
};

const bloquear = async ({ comensalId, bloqueadoId }, db = pool) => {
  await db.query('INSERT IGNORE INTO comensal_bloqueos (comensal_id, bloqueado_id) VALUES (?, ?)', [
    comensalId,
    bloqueadoId,
  ]);
};

// --- Moderación desde el panel ---

// El tenant de un comentario cuelga del plato, y el del plato de su categoría.
// `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin.
const acotar = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ` AND co.plato_id IN (SELECT p2.id FROM platos p2 JOIN categorias c2 ON c2.id = p2.categoria_id
                                    WHERE c2.restaurante_id = ?)`,
        params: [restauranteId],
      };

const listarParaModerar = async ({ restauranteId, estado, soloReportados, limite, desplazamiento }, db = pool) => {
  const t = acotar(restauranteId);
  const params = [...t.params];
  let filtro = t.sql;
  if (estado) {
    filtro += ' AND co.estado = ?';
    params.push(estado);
  }
  const [rows] = await db.query(
    `SELECT co.id, co.texto, co.estado, co.creado_en, co.moderado_en,
            p.id AS plato_id, p.nombre AS plato_nombre, cm.nombre AS autor_nombre,
            COUNT(rp.id) AS reportes,
            GROUP_CONCAT(DISTINCT rp.motivo ORDER BY rp.motivo SEPARATOR ',') AS motivos
       FROM comentarios co
       JOIN platos p ON p.id = co.plato_id
       JOIN comensales cm ON cm.id = co.comensal_id
       LEFT JOIN comentario_reportes rp ON rp.comentario_id = co.id AND rp.resuelto_en IS NULL
      WHERE 1 = 1${filtro}
      GROUP BY co.id, co.texto, co.estado, co.creado_en, co.moderado_en, p.id, p.nombre, cm.nombre
      ${soloReportados ? 'HAVING reportes > 0' : ''}
      ORDER BY (COUNT(rp.id) > 0) DESC, co.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limite, desplazamiento]
  );
  return rows;
};

// Mostrar u ocultar. Resolver la moderación cierra los reportes pendientes: si
// el restaurante decide que el comentario se queda, esos reportes ya cuentan
// como revisados y no lo vuelven a ocultar.
const moderar = async ({ id, estado, usuarioId, restauranteId }, db = pool) => {
  const t = acotar(restauranteId);
  const [r] = await db.query(
    `UPDATE comentarios co SET co.estado = ?, co.moderado_por = ?, co.moderado_en = NOW()
      WHERE co.id = ?${t.sql}`,
    [estado, usuarioId, id, ...t.params]
  );
  if (r.affectedRows) {
    await db.query('UPDATE comentario_reportes SET resuelto_en = NOW() WHERE comentario_id = ? AND resuelto_en IS NULL', [
      id,
    ]);
  }
  return r.affectedRows;
};

const eliminarComentario = async ({ id, restauranteId }, db = pool) => {
  const t = acotar(restauranteId);
  const [r] = await db.query(`DELETE co FROM comentarios co WHERE co.id = ?${t.sql}`, [id, ...t.params]);
  return r.affectedRows;
};

module.exports = {
  contarMeGusta,
  meGustaDe,
  marcarMeGusta,
  quitarMeGusta,
  guardadosDe,
  guardar,
  quitarGuardado,
  listarGuardados,
  adoptarDispositivo,
  contarComentarios,
  listarComentarios,
  contarComentariosPara,
  crearComentario,
  buscarComentario,
  eliminarComentarioPropio,
  comentariosRecientes,
  reportar,
  reportesPendientes,
  ocultarPorReportes,
  bloquear,
  listarParaModerar,
  moderar,
  eliminarComentario,
};
