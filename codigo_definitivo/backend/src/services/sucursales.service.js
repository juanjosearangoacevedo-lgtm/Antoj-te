const sucursalesModel = require('../models/sucursales.model');
const { NotFoundError } = require('../errors');

const listar = (restauranteId) => sucursalesModel.listar(restauranteId);

// Una sucursal de otro tenant se comporta como inexistente: el que sondea ids
// ajenos recibe 404 y no distingue "no existe" de "no es tuya".
const obtener = async (id, restauranteId = null) => {
  const sucursal = await sucursalesModel.buscarPorId(id, restauranteId);
  if (!sucursal) throw new NotFoundError('Sucursal no encontrada');
  return sucursal;
};

const crear = async (datos) => {
  const id = await sucursalesModel.crear(datos);
  return sucursalesModel.buscarPorId(id);
};

const actualizar = async (id, datos, restauranteId = null) => {
  const actualizadas = await sucursalesModel.actualizar(id, datos, restauranteId);
  if (actualizadas === 0) throw new NotFoundError('Sucursal no encontrada');
  return sucursalesModel.buscarPorId(id, restauranteId);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminadas = await sucursalesModel.eliminar(id, restauranteId);
  if (eliminadas === 0) throw new NotFoundError('Sucursal no encontrada');
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
