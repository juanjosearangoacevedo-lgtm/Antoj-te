const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const recomendacionesService = require('../services/recomendaciones.service');

const porPlato = asyncHandler(async (req, res) => {
  const limite = Number(req.query.limite) || 5;
  res.json(await recomendacionesService.porPlato(req.params.platoId, limite));
});

const crearOActualizar = asyncHandler(async (req, res) => {
  await recomendacionesService.crearOActualizar(req.body, resolveRestauranteId(req));
  res.status(201).json({ ok: true });
});

const eliminar = asyncHandler(async (req, res) => {
  await recomendacionesService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { porPlato, crearOActualizar, eliminar };
