const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const analiticaService = require('../services/analitica.service');

const registrarEvento = asyncHandler(async (req, res) => {
  await analiticaService.registrarEvento(req.body);
  res.status(201).json({ ok: true });
});

const resumen = asyncHandler(async (req, res) => {
  res.json(await analiticaService.resumen(resolveRestauranteId(req), req.query));
});

const productos = asyncHandler(async (req, res) => {
  res.json(await analiticaService.productos(resolveRestauranteId(req), req.query));
});

const actividad = asyncHandler(async (req, res) => {
  res.json(await analiticaService.actividad(resolveRestauranteId(req), req.query));
});

// Sin resolveRestauranteId: es una vista de toda la plataforma y la ruta ya la
// restringe a superadmin.
const plataforma = asyncHandler(async (req, res) => {
  res.json(await analiticaService.plataforma(req.query));
});

module.exports = { registrarEvento, resumen, productos, actividad, plataforma };
