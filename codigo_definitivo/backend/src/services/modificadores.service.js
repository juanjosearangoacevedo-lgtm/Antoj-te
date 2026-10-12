const modificadoresModel = require('../models/modificadores.model');
const { NotFoundError } = require('../errors');

// Cada grupo se devuelve con sus opciones: es como lo consume el frontend.
const listarGrupos = async (restauranteId) => {
  const grupos = await modificadoresModel.listarGrupos(restauranteId);
  return Promise.all(
    grupos.map(async (g) => ({ ...g, opciones: await modificadoresModel.opcionesDeGrupo(g.id) }))
  );
};

const crearGrupo = async (datos) => {
  const id = await modificadoresModel.crearGrupo(datos);
  return modificadoresModel.buscarGrupoPorId(id);
};

const actualizarGrupo = async (id, datos, restauranteId = null) => {
  const actualizados = await modificadoresModel.actualizarGrupo(id, datos, restauranteId);
  if (actualizados === 0) throw new NotFoundError('Grupo no encontrado');
  return modificadoresModel.buscarGrupoPorId(id, restauranteId);
};

const eliminarGrupo = async (id, restauranteId = null) => {
  const eliminados = await modificadoresModel.eliminarGrupo(id, restauranteId);
  if (eliminados === 0) throw new NotFoundError('Grupo no encontrado');
};

// El grupo es el que ata la opción a un tenant, así que aceptarlo del cliente sin
// comprobarlo dejaría colgar opciones (con su precio) del menú de otro restaurante.
const crearOpcion = async (datos, restauranteId = null) => {
  if (restauranteId != null) {
    const grupo = await modificadoresModel.buscarGrupoPorId(datos.grupo_id, restauranteId);
    if (!grupo) throw new NotFoundError('Grupo no encontrado');
  }
  const id = await modificadoresModel.crearOpcion(datos);
  return modificadoresModel.buscarOpcionPorId(id, restauranteId);
};

const actualizarOpcion = async (id, datos, restauranteId = null) => {
  const actualizadas = await modificadoresModel.actualizarOpcion(id, datos, restauranteId);
  if (actualizadas === 0) throw new NotFoundError('Opcion no encontrada');
  return modificadoresModel.buscarOpcionPorId(id, restauranteId);
};

const eliminarOpcion = async (id, restauranteId = null) => {
  const eliminadas = await modificadoresModel.eliminarOpcion(id, restauranteId);
  if (eliminadas === 0) throw new NotFoundError('Opcion no encontrada');
};

module.exports = {
  listarGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  crearOpcion,
  actualizarOpcion,
  eliminarOpcion,
};
