const asyncHandler = require('../middlewares/asyncHandler');
const planesService = require('../services/planes.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await planesService.listar());
});

// Público: lo que pinta la sección de precios de la landing. Sin autenticar y sin
// los interruptores técnicos de cada plan.
const listarPublicos = asyncHandler(async (req, res) => {
  res.json(await planesService.listarPublicos());
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await planesService.obtener(req.params.id));
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(await planesService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await planesService.actualizar(req.params.id, req.body));
});

const eliminar = asyncHandler(async (req, res) => {
  await planesService.eliminar(req.params.id);
  res.status(204).send();
});

module.exports = { listar, listarPublicos, obtener, crear, actualizar, eliminar };
