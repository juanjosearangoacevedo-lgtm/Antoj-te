const pool = require('../config/db');

// Acceso a `grupos_modificadores` y `opciones_modificadores`.
// Un grupo es una pregunta ("Elige tu proteína") y las opciones sus respuestas.

const listarGrupos = async (restauranteId, db = pool) => {
  const params = [];
  let sql = 'SELECT * FROM grupos_modificadores WHERE 1=1';
  if (restauranteId) {
    sql += ' AND restaurante_id = ?';
    params.push(restauranteId);
  }
  const [rows] = await db.query(sql + ' ORDER BY id', params);
  return rows;
};

// `restauranteId` nulo = sin acotar, y SOLO lo usa el superadmin. El grupo lleva el
// tenant en su fila; la opción lo hereda a través de su grupo.
const acotarGrupo = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : { sql: ' AND restaurante_id = ?', params: [restauranteId] };

const acotarOpcion = (restauranteId) =>
  restauranteId == null
    ? { sql: '', params: [] }
    : {
        sql: ' AND grupo_id IN (SELECT id FROM grupos_modificadores WHERE restaurante_id = ?)',
        params: [restauranteId],
      };

const buscarGrupoPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotarGrupo(restauranteId);
  const [rows] = await db.query(`SELECT * FROM grupos_modificadores WHERE id = ?${t.sql}`, [
    id,
    ...t.params,
  ]);
  return rows[0] || null;
};

const opcionesDeGrupo = async (grupoId, db = pool) => {
  const [rows] = await db.query('SELECT * FROM opciones_modificadores WHERE grupo_id = ?', [grupoId]);
  return rows;
};

const crearGrupo = async (
  { restaurante_id, nombre, min_seleccion, max_seleccion, es_obligatorio },
  db = pool
) => {
  const [result] = await db.query(
    'INSERT INTO grupos_modificadores (restaurante_id, nombre, min_seleccion, max_seleccion, es_obligatorio) VALUES (?, ?, ?, ?, ?)',
    [restaurante_id, nombre, min_seleccion || 0, max_seleccion || 1, es_obligatorio ? 1 : 0]
  );
  return result.insertId;
};

const actualizarGrupo = async (
  id,
  { nombre, min_seleccion, max_seleccion, es_obligatorio },
  restauranteId = null,
  db = pool
) => {
  const t = acotarGrupo(restauranteId);
  const [result] = await db.query(
    `UPDATE grupos_modificadores SET nombre = COALESCE(?, nombre), min_seleccion = COALESCE(?, min_seleccion),
     max_seleccion = COALESCE(?, max_seleccion), es_obligatorio = COALESCE(?, es_obligatorio) WHERE id = ?${t.sql}`,
    [
      nombre,
      min_seleccion,
      max_seleccion,
      es_obligatorio === undefined ? null : es_obligatorio ? 1 : 0,
      id,
      ...t.params,
    ]
  );
  return result.affectedRows;
};

const eliminarGrupo = async (id, restauranteId = null, db = pool) => {
  const t = acotarGrupo(restauranteId);
  const [result] = await db.query(`DELETE FROM grupos_modificadores WHERE id = ?${t.sql}`, [
    id,
    ...t.params,
  ]);
  return result.affectedRows;
};

const buscarOpcionPorId = async (id, restauranteId = null, db = pool) => {
  const t = acotarOpcion(restauranteId);
  const [rows] = await db.query(`SELECT * FROM opciones_modificadores WHERE id = ?${t.sql}`, [
    id,
    ...t.params,
  ]);
  return rows[0] || null;
};

const crearOpcion = async ({ grupo_id, nombre, precio_adicional, ingrediente_id }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO opciones_modificadores (grupo_id, nombre, precio_adicional, ingrediente_id) VALUES (?, ?, ?, ?)',
    [grupo_id, nombre, precio_adicional || 0, ingrediente_id || null]
  );
  return result.insertId;
};

const actualizarOpcion = async (
  id,
  { nombre, precio_adicional, ingrediente_id },
  restauranteId = null,
  db = pool
) => {
  const t = acotarOpcion(restauranteId);
  const [result] = await db.query(
    `UPDATE opciones_modificadores SET nombre = COALESCE(?, nombre), precio_adicional = COALESCE(?, precio_adicional), ingrediente_id = COALESCE(?, ingrediente_id) WHERE id = ?${t.sql}`,
    [nombre, precio_adicional, ingrediente_id, id, ...t.params]
  );
  return result.affectedRows;
};

const eliminarOpcion = async (id, restauranteId = null, db = pool) => {
  const t = acotarOpcion(restauranteId);
  const [result] = await db.query(`DELETE FROM opciones_modificadores WHERE id = ?${t.sql}`, [
    id,
    ...t.params,
  ]);
  return result.affectedRows;
};

module.exports = {
  listarGrupos,
  buscarGrupoPorId,
  opcionesDeGrupo,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  buscarOpcionPorId,
  crearOpcion,
  actualizarOpcion,
  eliminarOpcion,
};
