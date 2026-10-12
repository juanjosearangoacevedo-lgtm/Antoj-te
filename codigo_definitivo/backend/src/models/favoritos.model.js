const pool = require('../config/db');

// Acceso a `favoritos`. La sesión del comensal es anónima: se identifica por
// `sesion_token`, y cada favorito apunta a un plato O a un combo (nunca a ambos).

const buscar = async ({ sesion_token, plato_id, combo_id }, db = pool) => {
  const params = [sesion_token];
  let sql = 'SELECT id FROM favoritos WHERE sesion_token = ?';

  if (plato_id) {
    sql += ' AND plato_id = ?';
    params.push(plato_id);
  } else {
    sql += ' AND plato_id IS NULL';
  }

  if (combo_id) {
    sql += ' AND combo_id = ?';
    params.push(combo_id);
  } else {
    sql += ' AND combo_id IS NULL';
  }

  const [rows] = await db.query(sql, params);
  return rows[0] || null;
};

const crear = async ({ sesion_token, plato_id, combo_id }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO favoritos (sesion_token, plato_id, combo_id) VALUES (?, ?, ?)',
    [sesion_token, plato_id || null, combo_id || null]
  );
  return result.insertId;
};

const eliminar = async (id, db = pool) => {
  const [result] = await db.query('DELETE FROM favoritos WHERE id = ?', [id]);
  return result.affectedRows;
};

const listarPorSesion = async (sesionToken, db = pool) => {
  const [rows] = await db.query(
    `SELECT f.id, f.plato_id, f.combo_id, p.nombre AS plato_nombre, c.nombre AS combo_nombre
     FROM favoritos f
     LEFT JOIN platos p ON p.id = f.plato_id
     LEFT JOIN combos c ON c.id = f.combo_id
     WHERE f.sesion_token = ?`,
    [sesionToken]
  );
  return rows;
};

module.exports = { buscar, crear, eliminar, listarPorSesion };
