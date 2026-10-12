const asyncHandler = require('../middlewares/asyncHandler');
const favoritosService = require('../services/favoritos.service');

const toggle = asyncHandler(async (req, res) => {
  res.json(await favoritosService.toggle(req.body));
});

const listarPorSesion = asyncHandler(async (req, res) => {
  res.json(await favoritosService.listarPorSesion(req.params.sesionToken));
});

module.exports = { toggle, listarPorSesion };
