const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const combosService = require('../services/combos.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await combosService.listar(resolveRestauranteId(req)));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await combosService.obtener(req.params.id, resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, descripcion, precio, video_url, items } = req.body;
  const restauranteId = resolveRestauranteId(req) || req.body.restaurante_id;
  if (!nombre || !restauranteId) throw new ApiError(400, 'nombre y restaurante_id son obligatorios');
  res.status(201).json(
    await combosService.crear({ restaurante_id: restauranteId, nombre, descripcion, precio, video_url, items })
  );
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await combosService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const setItems = asyncHandler(async (req, res) => {
  await combosService.setItems(req.params.id, req.body.items, resolveRestauranteId(req));
  res.json({ ok: true });
});

const eliminar = asyncHandler(async (req, res) => {
  await combosService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { listar, obtener, crear, actualizar, setItems, eliminar };
