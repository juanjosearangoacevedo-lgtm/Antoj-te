const pool = require('../config/db');

// Acceso a `comensales`: la cuenta del usuario final de la app móvil. Nada de
// aquí toca `usuarios` (el staff): son dos identidades separadas a propósito.
// Nunca devuelve `password_hash` salvo en las dos consultas que lo necesitan
// (login y comprobar la clave actual).

const COLUMNAS_PUBLICAS = 'id, nombre, email, telefono, email_verificado_en, sesion_version, creado_en';

// Con el hash: solo para el login.
const buscarPorEmail = async (email, db = pool) => {
  const [rows] = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS}, password_hash FROM comensales WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const buscarPorId = async (id, db = pool) => {
  const [rows] = await db.query(`SELECT ${COLUMNAS_PUBLICAS} FROM comensales WHERE id = ?`, [id]);
  return rows[0] || null;
};

// Solo el hash, y por id: para comprobar la clave actual de quien ya está dentro.
const passwordPorId = async (id, db = pool) => {
  const [rows] = await db.query('SELECT id, password_hash FROM comensales WHERE id = ?', [id]);
  return rows[0] || null;
};

// `terminos_aceptados_en` lo pone la base: es la hora del alta, no una que pueda
// mandar el cliente.
const crear = async ({ nombre, email, telefono, password_hash }, db = pool) => {
  const [result] = await db.query(
    `INSERT INTO comensales (nombre, email, telefono, password_hash, terminos_aceptados_en, ultimo_acceso_en)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [nombre, email, telefono || null, password_hash]
  );
  return result.insertId;
};

// Solo toca los campos presentes. `undefined` = no se envió, se conserva;
// `null` en el teléfono = borrarlo, que es un cambio válido. COALESCE no sabría
// distinguir los dos casos, por eso el SET se arma con lo que llegó.
const actualizarPerfil = async (id, cambios, db = pool) => {
  const permitidos = ['nombre', 'telefono'];
  const campos = permitidos.filter((c) => cambios[c] !== undefined);
  if (!campos.length) return 0;

  const [result] = await db.query(
    `UPDATE comensales SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...campos.map((c) => cambios[c]), id]
  );
  return result.affectedRows;
};

const guardarPassword = async (id, password_hash, db = pool) => {
  const [result] = await db.query('UPDATE comensales SET password_hash = ? WHERE id = ?', [
    password_hash,
    id,
  ]);
  return result.affectedRows;
};

const marcarEmailVerificado = async (id, db = pool) => {
  await db.query(
    'UPDATE comensales SET email_verificado_en = COALESCE(email_verificado_en, NOW()) WHERE id = ?',
    [id]
  );
};

const registrarAcceso = async (id, db = pool) => {
  await db.query('UPDATE comensales SET ultimo_acceso_en = NOW() WHERE id = ?', [id]);
};

// Versión de sesión vigente. null = la cuenta ya no existe.
const versionSesion = async (id, db = pool) => {
  const [rows] = await db.query('SELECT sesion_version FROM comensales WHERE id = ?', [id]);
  return rows[0] ? Number(rows[0].sesion_version) : null;
};

// Sube la versión: todo token de acceso emitido hasta ahora deja de valer.
const subirVersionSesion = async (id, db = pool) => {
  await db.query('UPDATE comensales SET sesion_version = sesion_version + 1 WHERE id = ?', [id]);
};

// Borra la cuenta. Sesiones y códigos caen en cascada (ver la migración).
const eliminar = async (id, db = pool) => {
  const [result] = await db.query('DELETE FROM comensales WHERE id = ?', [id]);
  return result.affectedRows;
};

// El choque del índice único del correo, traducido para que el service no tenga
// que conocer códigos de error de MySQL.
const esEmailDuplicado = (err) => err?.code === 'ER_DUP_ENTRY';

module.exports = {
  buscarPorEmail,
  buscarPorId,
  passwordPorId,
  crear,
  actualizarPerfil,
  guardarPassword,
  marcarEmailVerificado,
  registrarAcceso,
  versionSesion,
  subirVersionSesion,
  eliminar,
  esEmailDuplicado,
};
