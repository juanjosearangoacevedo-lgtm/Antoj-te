const pool = require('../config/db');

// Acceso a `solicitudes_demo`: los interesados que dejan sus datos en la
// landing. Como manda la arquitectura, aquí no se lanza ApiError ni se decide
// nada: se devuelve fila, null o filas afectadas y el service traduce.

const crear = async (
  {
    restaurante_nombre,
    ciudad,
    direccion,
    contacto_nombre,
    telefono,
    email,
    password_hash,
    plan_id,
    mensaje,
    ip_origen,
  },
  db = pool
) => {
  const [result] = await db.query(
    `INSERT INTO solicitudes_demo
       (restaurante_nombre, ciudad, direccion, contacto_nombre, telefono, email, password_hash, plan_id, mensaje, ip_origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      restaurante_nombre,
      ciudad,
      direccion,
      contacto_nombre,
      telefono,
      email,
      password_hash || null,
      plan_id || null,
      mensaje,
      ip_origen,
    ]
  );
  return result.insertId;
};

// El hash NUNCA sale de aquí salvo que se pida a propósito (solo lo necesita la
// aprobación, para copiarlo al usuario). Todo lo demás usa `buscarPorId`.
const CAMPOS_PUBLICOS = `id, restaurante_nombre, ciudad, direccion, contacto_nombre, telefono, email,
  plan_id, mensaje, estado, nota_interna, motivo_rechazo, restaurante_id, usuario_id,
  revisada_por, revisada_en, creado_en, actualizado_en`;

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM solicitudes_demo WHERE id = ?`, [id]);
  return rows[0] || null;
};

const buscarConPasswordPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT * FROM solicitudes_demo WHERE id = ?', [id]);
  return rows[0] || null;
};

// ¿Ya hay una solicitud sin resolver con este correo? Evita que quien pulsa dos
// veces "enviar" acabe con dos cuentas al aprobarlas.
const pendientePorEmail = async (email, db = pool) => {
  const [rows] = await db.query(
    "SELECT id FROM solicitudes_demo WHERE email = ? AND estado IN ('nueva','contactada') LIMIT 1",
    [email]
  );
  return rows[0] || null;
};

// Marca la solicitud como aprobada y deja constancia de lo que se creó con ella.
const marcarAprobada = async (id, { restaurante_id, usuario_id, plan_id, revisada_por }, db = pool) => {
  const [result] = await db.query(
    `UPDATE solicitudes_demo
        SET estado = 'aprobada', restaurante_id = ?, usuario_id = ?, plan_id = ?,
            revisada_por = ?, revisada_en = NOW()
      WHERE id = ? AND estado NOT IN ('aprobada','rechazada')`,
    [restaurante_id, usuario_id, plan_id, revisada_por, id]
  );
  return result.affectedRows;
};

const marcarRechazada = async (id, { motivo, revisada_por }, db = pool) => {
  const [result] = await db.query(
    `UPDATE solicitudes_demo
        SET estado = 'rechazada', motivo_rechazo = ?, revisada_por = ?, revisada_en = NOW()
      WHERE id = ? AND estado NOT IN ('aprobada','rechazada')`,
    [motivo || null, revisada_por, id]
  );
  return result.affectedRows;
};

// Las nuevas primero: es el orden en que hay que atenderlas.
const listar = async ({ estado } = {}, db = pool) => {
  const [rows] = await db.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM solicitudes_demo
      ${estado ? 'WHERE estado = ?' : ''}
      ORDER BY FIELD(estado, 'nueva', 'contactada', 'cerrada', 'aprobada', 'rechazada'), creado_en DESC`,
    estado ? [estado] : []
  );
  return rows;
};

const contarPorEstado = async (db = pool) => {
  const [rows] = await db.query('SELECT estado, COUNT(*) AS total FROM solicitudes_demo GROUP BY estado');
  return rows;
};

const actualizarSeguimiento = async (id, { estado, nota_interna }, db = pool) => {
  const [result] = await db.query(
    `UPDATE solicitudes_demo
        SET estado = COALESCE(?, estado),
            nota_interna = COALESCE(?, nota_interna)
      WHERE id = ?`,
    [estado, nota_interna, id]
  );
  return result.affectedRows;
};

// Cuántas solicitudes mandó esta IP en los últimos N minutos. Es lo que sostiene
// el límite de envíos: sin esto el endpoint es público y escribe en la base.
const contarRecientesPorIp = async (ip, minutos, db = pool) => {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM solicitudes_demo WHERE ip_origen = ? AND creado_en > (NOW() - INTERVAL ? MINUTE)',
    [ip, minutos]
  );
  return rows[0].total;
};

module.exports = {
  crear,
  buscarPorId,
  buscarConPasswordPorId,
  pendientePorEmail,
  marcarAprobada,
  marcarRechazada,
  listar,
  contarPorEstado,
  actualizarSeguimiento,
  contarRecientesPorIp,
};
