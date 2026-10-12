const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const mesasService = require('../services/mesas.service');

const listarPorSucursal = asyncHandler(async (req, res) => {
  res.json(await mesasService.listarPorSucursal(req.params.sucursalId, resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(await mesasService.crear(req.body, resolveRestauranteId(req)));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await mesasService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const regenerarQr = asyncHandler(async (req, res) => {
  res.json(await mesasService.regenerarQr(req.params.id, resolveRestauranteId(req)));
});

const eliminar = asyncHandler(async (req, res) => {
  await mesasService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

const resolverPorToken = asyncHandler(async (req, res) => {
  res.json(await mesasService.resolverPorToken(req.params.token));
});

module.exports = { listarPorSucursal, crear, actualizar, regenerarQr, eliminar, resolverPorToken };
