const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const socialService = require('../services/social.service');

// Moderación de los comentarios que dejan en la app sobre los platos del
// restaurante. Todo va acotado al restaurante de quien pregunta; el superadmin
// ve todos.

const listar = asyncHandler(async (req, res) => {
  const { estado, reportados, pagina } = req.query;
  res.json(await socialService.paraModerar(resolveRestauranteId(req), { estado, reportados, pagina }));
});

const moderar = asyncHandler(async (req, res) => {
  await socialService.moderar(req.params.id, req.body.estado, req.user.id, resolveRestauranteId(req));
  res.json({ ok: true });
});

const eliminar = asyncHandler(async (req, res) => {
  await socialService.eliminarModerado(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = { listar, moderar, eliminar };
