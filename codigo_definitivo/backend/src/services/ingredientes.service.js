const ingredientesModel = require('../models/ingredientes.model');
const { BadRequestError, NotFoundError } = require('../errors');

const listar = (restauranteId) => ingredientesModel.listar(restauranteId);

const crear = async (datos) => {
  const id = await ingredientesModel.crear(datos);
  return ingredientesModel.buscarPorId(id);
};

// Un ingrediente de otro tenant se comporta como inexistente: el que sondea ids
// ajenos recibe 404 y no distingue "no existe" de "no es tuyo".
const actualizar = async (id, datos, restauranteId = null) => {
  const actualizados = await ingredientesModel.actualizar(id, datos, restauranteId);
  if (actualizados === 0) throw new NotFoundError('Ingrediente no encontrado');
  return ingredientesModel.buscarPorId(id, restauranteId);
};

// `delta` puede ser positivo o negativo. El model no aplica el ajuste si dejaría
// el stock en negativo, así que 0 filas afectadas significa una de tres cosas.
const ajustarStock = async (id, delta, restauranteId = null) => {
  const ajustados = await ingredientesModel.ajustarStock(id, delta, restauranteId);
  if (ajustados === 0) {
    throw new BadRequestError(
      'No se pudo ajustar el stock (ingrediente inexistente o quedaria negativo)'
    );
  }
  return ingredientesModel.buscarPorId(id, restauranteId);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminados = await ingredientesModel.eliminar(id, restauranteId);
  if (eliminados === 0) throw new NotFoundError('Ingrediente no encontrado');
};

module.exports = { listar, crear, actualizar, ajustarStock, eliminar };
