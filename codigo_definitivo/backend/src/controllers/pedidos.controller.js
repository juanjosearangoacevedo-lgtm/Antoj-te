const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const pedidosService = require('../services/pedidos.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await pedidosService.listar(resolveRestauranteId(req), req.query));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await pedidosService.obtener(req.params.id, resolveRestauranteId(req)));
});

const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(
    await pedidosService.cambiarEstado(req.params.id, req.body.estado, resolveRestauranteId(req))
  );
});

const misPedidos = asyncHandler(async (req, res) => {
  res.json(await pedidosService.misPedidos(req.params.sesionToken));
});

module.exports = { listar, obtener, cambiarEstado, misPedidos };
