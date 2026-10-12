const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const llamadosService = require('../services/llamados.service');

// Público: el comensal llama desde su mesa. El token del QR va en la ruta.
const crear = asyncHandler(async (req, res) => {
  const llamado = await llamadosService.crear(req.params.token, req.body);
  // 200 y no 201 cuando el llamado ya existía: no se creó nada nuevo.
  res.status(llamado.ya_estaba ? 200 : 201).json(llamado);
});

// Staff: los llamados sin atender del restaurante.
const listarPendientes = asyncHandler(async (req, res) => {
  res.json(await llamadosService.listarPendientes(resolveRestauranteId(req), req.query));
});

const atender = asyncHandler(async (req, res) => {
  res.json(
    await llamadosService.atender(req.params.id, resolveRestauranteId(req), req.user.id)
  );
});

module.exports = { crear, listarPendientes, atender };
