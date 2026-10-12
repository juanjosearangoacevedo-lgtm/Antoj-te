const categoriasModel = require('../models/categorias.model');
const { NotFoundError } = require('../errors');

const listar = (restauranteId) => categoriasModel.listar(restauranteId);

const crear = async (datos) => {
  const id = await categoriasModel.crear(datos);
  return categoriasModel.buscarPorId(id);
};

// Una categoria de otro tenant no actualiza ninguna fila, y eso se traduce en 404:
// el que sondea ids ajenos no distingue "no existe" de "no es tuya".
const actualizar = async (id, datos, restauranteId = null) => {
  const actualizadas = await categoriasModel.actualizar(id, datos, restauranteId);
  if (actualizadas === 0) throw new NotFoundError('Categoria no encontrada');
  return categoriasModel.buscarPorId(id, restauranteId);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminadas = await categoriasModel.eliminar(id, restauranteId);
  if (eliminadas === 0) throw new NotFoundError('Categoria no encontrada');
};

module.exports = { listar, crear, actualizar, eliminar };
