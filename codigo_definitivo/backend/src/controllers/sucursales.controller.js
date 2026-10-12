const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const sucursalesService = require('../services/sucursales.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await sucursalesService.listar(resolveRestauranteId(req)));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await sucursalesService.obtener(req.params.id, resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  const restauranteId = resolveRestauranteId(req) || req.body.restaurante_id;
  if (!nombre || !restauranteId) throw new ApiError(400, 'nombre y restaurante_id son obligatorios');
  res
    .status(201)
    .json(await sucursalesService.crear({ restaurante_id: restauranteId, nombre, direccion, telefono }));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await sucursalesService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const eliminar = asyncHandler(async (req, res) => {
  await sucursalesService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
