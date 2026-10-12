const pool = require('../config/db');

// Acceso a `password_resets`: los enlaces de un solo uso de "recuperar contraseña".
// Aquí solo viaja el hash del token; el token en claro no toca la base.

const crear = async ({ usuarioId, tokenHash, minutos, ip }, db = pool) => {
  await db.query(
    `INSERT INTO password_resets (usuario_id, token_hash, expira_en, ip)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)`,
    [usuarioId, tokenHash, minutos, ip || null]
  );
};

// Cuántos enlaces pidió este usuario en los últimos `minutos`. Frena que alguien
// que conoce un correo ajeno le llene la bandeja pidiendo enlaces sin parar.
const contarRecientes = async (usuarioId, minutos, db = pool) => {
  const [[fila]] = await db.query(
    `SELECT COUNT(*) AS n FROM password_resets
     WHERE usuario_id = ? AND creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [usuarioId, minutos]
  );
  return Number(fila.n);
};

// Solo enlaces vivos: sin usar y sin caducar. `bloquear` evita que dos clics
// casi simultáneos en el mismo enlace lo usen dos veces.
const buscarVigente = async (tokenHash, db = pool, { bloquear = false } = {}) => {
  const [rows] = await db.query(
    `SELECT id, usuario_id FROM password_resets
     WHERE token_hash = ? AND usado_en IS NULL AND expira_en > NOW()${bloquear ? ' FOR UPDATE' : ''}`,
    [tokenHash]
  );
  return rows[0] || null;
};

// Anula TODOS los enlaces vivos del usuario, no solo el que se usó: si pidió
// tres y usó uno, los otros dos no deben seguir abriendo la cuenta.
const anularDeUsuario = async (usuarioId, db = pool) => {
  await db.query(
    'UPDATE password_resets SET usado_en = NOW() WHERE usuario_id = ? AND usado_en IS NULL',
    [usuarioId]
  );
};

module.exports = { crear, contarRecientes, buscarVigente, anularDeUsuario };
