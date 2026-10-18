const pool = require('../config/db');

// Acceso a `comensales_sesiones`: una fila por dispositivo con sesión abierta.
// Solo viaja el hash del refresh token; el token en claro no toca la base.

const crear = async ({ comensalId, refreshHash, dispositivoId, plataforma, dias }, db = pool) => {
  const [result] = await db.query(
    `INSERT INTO comensales_sesiones (comensal_id, refresh_hash, dispositivo_id, plataforma, expira_en, ultimo_uso_en)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW())`,
    [comensalId, refreshHash, dispositivoId || null, plataforma || null, dias]
  );
  return result.insertId;
};

// La sesión viva que corresponde a un refresh token: el vigente o, durante la
// gracia tras rotar, el anterior. `es_vigente` dice cuál de los dos coincidió,
// porque rotar desde uno o desde otro no es lo mismo (ver `rotar`).
// `bloquear` evita que dos renovaciones simultáneas con el mismo token roten dos
// veces y dejen al teléfono con un token que ya no existe.
const buscarVivaPorHash = async (hash, graciaSegundos, db = pool, { bloquear = false } = {}) => {
  const [rows] = await db.query(
    `SELECT id, comensal_id, (refresh_hash = ?) AS es_vigente
     FROM comensales_sesiones
     WHERE (refresh_hash = ?
            OR (refresh_hash_anterior = ? AND rotada_en > DATE_SUB(NOW(), INTERVAL ? SECOND)))
       AND revocada_en IS NULL
       AND expira_en > NOW()
     LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [hash, hash, hash, graciaSegundos]
  );
  return rows[0] || null;
};

// Rota el refresh token y alarga la sesión (vencimiento deslizante).
//
// Desde el token VIGENTE: el vigente pasa a anterior y empieza la gracia.
// Desde el ANTERIOR (el teléfono perdió la respuesta de la rotación previa):
// solo se cambia el vigente. Ni el anterior ni `rotada_en` se tocan, porque si
// no, un token viejo usado cada dos minutos seguiría vivo para siempre.
//
// En un UPDATE de MySQL las asignaciones se evalúan de izquierda a derecha, así
// que `refresh_hash_anterior = refresh_hash` copia el valor de ANTES de cambiarlo.
const rotar = async (id, { nuevoHash, desdeVigente, dias, dispositivoId, plataforma }, db = pool) => {
  const sets = desdeVigente
    ? 'refresh_hash_anterior = refresh_hash, refresh_hash = ?, rotada_en = NOW(),'
    : 'refresh_hash = ?,';
  const [result] = await db.query(
    `UPDATE comensales_sesiones
     SET ${sets} expira_en = DATE_ADD(NOW(), INTERVAL ? DAY), ultimo_uso_en = NOW(),
         dispositivo_id = COALESCE(?, dispositivo_id), plataforma = COALESCE(?, plataforma)
     WHERE id = ?`,
    [nuevoHash, dias, dispositivoId || null, plataforma || null, id]
  );
  return result.affectedRows;
};

// Cierra la sesión de un dispositivo. Acepta el token vigente o el anterior: da
// igual con cuál se cierre, el resultado es el mismo.
const revocarPorHash = async (hash, db = pool) => {
  const [result] = await db.query(
    `UPDATE comensales_sesiones SET revocada_en = NOW()
     WHERE (refresh_hash = ? OR refresh_hash_anterior = ?) AND revocada_en IS NULL`,
    [hash, hash]
  );
  return result.affectedRows;
};

// Cierra TODAS las sesiones del comensal: al cambiar o restablecer la clave.
const revocarTodas = async (comensalId, db = pool) => {
  const [result] = await db.query(
    'UPDATE comensales_sesiones SET revocada_en = NOW() WHERE comensal_id = ? AND revocada_en IS NULL',
    [comensalId]
  );
  return result.affectedRows;
};

module.exports = { crear, buscarVivaPorHash, rotar, revocarPorHash, revocarTodas };
