const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const categoriasService = require('../services/categorias.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await categoriasService.listar(resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, orden } = req.body;
  const restauranteId = resolveRestauranteId(req) || req.body.restaurante_id;
  if (!nombre || !restauranteId) throw new ApiError(400, 'nombre y restaurante_id son obligatorios');
  res.status(201).json(await categoriasService.crear({ restaurante_id: restauranteId, nombre, orden }));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await categoriasService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const eliminar = asyncHandler(async (req, res) => {
  await categoriasService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, eliminar };
