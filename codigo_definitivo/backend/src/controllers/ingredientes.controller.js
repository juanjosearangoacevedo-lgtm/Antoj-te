const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const ingredientesService = require('../services/ingredientes.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await ingredientesService.listar(resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, costo_unitario, es_alergeno, stock_actual } = req.body;
  const restauranteId = resolveRestauranteId(req) || req.body.restaurante_id;
  if (!nombre || !restauranteId) throw new ApiError(400, 'nombre y restaurante_id son obligatorios');
  res.status(201).json(
    await ingredientesService.crear({
      restaurante_id: restauranteId,
      nombre,
      costo_unitario,
      es_alergeno,
      stock_actual,
    })
  );
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await ingredientesService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const ajustarStock = asyncHandler(async (req, res) => {
  res.json(
    await ingredientesService.ajustarStock(req.params.id, req.body.delta, resolveRestauranteId(req))
  );
});

const eliminar = asyncHandler(async (req, res) => {
  await ingredientesService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, ajustarStock, eliminar };
