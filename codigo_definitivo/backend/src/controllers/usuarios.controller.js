const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const usuariosService = require('../services/usuarios.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await usuariosService.listar(resolveRestauranteId(req)));
});

const crear = asyncHandler(async (req, res) => {
  const restauranteId =
    req.user.role_nombre === 'superadmin' ? req.body.restaurante_id || null : req.user.restaurante_id;
  res
    .status(201)
    .json(await usuariosService.crear({ ...req.body, restaurante_id: restauranteId }, req.user));
});

// req.user viaja al service porque quien pide la operacion decide su alcance:
// a que tenant queda acotada y que roles puede repartir.
const actualizar = asyncHandler(async (req, res) => {
  res.json(await usuariosService.actualizar(req.params.id, req.body, req.user));
});

const eliminar = asyncHandler(async (req, res) => {
  await usuariosService.eliminar(req.params.id, req.user);
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, eliminar };
