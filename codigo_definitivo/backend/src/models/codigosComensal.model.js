const pool = require('../config/db');

// Acceso a `comensales_codigos`: códigos de 6 dígitos que llegan por correo.
// Solo viaja su HMAC (ver utils/codigos.js); el código en claro no toca la base.

const crear = async ({ comensalId, proposito, codigoHash, minutos, ip }, db = pool) => {
  await db.query(
    `INSERT INTO comensales_codigos (comensal_id, proposito, codigo_hash, expira_en, ip)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)`,
    [comensalId, proposito, codigoHash, minutos, ip || null]
  );
};

// Cuántos códigos de este propósito se pidieron en los últimos `minutos`. Frena
// que alguien que conoce un correo ajeno le llene la bandeja.
const contarRecientes = async (comensalId, proposito, minutos, db = pool) => {
  const [[fila]] = await db.query(
    `SELECT COUNT(*) AS n FROM comensales_codigos
     WHERE comensal_id = ? AND proposito = ? AND creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [comensalId, proposito, minutos]
  );
  return Number(fila.n);
};

// Al pedir un código nuevo, los anteriores dejan de valer: así hay como mucho
// uno vivo por propósito, y el tope de intentos no se multiplica pidiendo más.
const anularVivos = async (comensalId, proposito, db = pool) => {
  await db.query(
    `UPDATE comensales_codigos SET usado_en = NOW()
     WHERE comensal_id = ? AND proposito = ? AND usado_en IS NULL`,
    [comensalId, proposito]
  );
};

// El código vivo: sin usar, sin caducar y con intentos disponibles. `bloquear`
// evita que dos intentos simultáneos se cuenten como uno.
const buscarVivo = async (comensalId, proposito, maxIntentos, db = pool, { bloquear = false } = {}) => {
  const [rows] = await db.query(
    `SELECT id, codigo_hash, intentos FROM comensales_codigos
     WHERE comensal_id = ? AND proposito = ? AND usado_en IS NULL
       AND expira_en > NOW() AND intentos < ?
     ORDER BY id DESC LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [comensalId, proposito, maxIntentos]
  );
  return rows[0] || null;
};

const sumarIntento = async (id, db = pool) => {
  await db.query('UPDATE comensales_codigos SET intentos = intentos + 1 WHERE id = ?', [id]);
};

const marcarUsado = async (id, db = pool) => {
  await db.query('UPDATE comensales_codigos SET usado_en = NOW() WHERE id = ?', [id]);
};

module.exports = { crear, contarRecientes, anularVivos, buscarVivo, sumarIntento, marcarUsado };
