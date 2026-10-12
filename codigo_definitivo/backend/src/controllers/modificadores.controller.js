const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const modificadoresService = require('../services/modificadores.service');

const listarGrupos = asyncHandler(async (req, res) => {
  res.json(await modificadoresService.listarGrupos(resolveRestauranteId(req)));
});

const crearGrupo = asyncHandler(async (req, res) => {
  const { nombre, min_seleccion, max_seleccion, es_obligatorio } = req.body;
  const restauranteId = resolveRestauranteId(req) || req.body.restaurante_id;
  if (!nombre || !restauranteId) throw new ApiError(400, 'nombre y restaurante_id son obligatorios');
  res.status(201).json(
    await modificadoresService.crearGrupo({
      restaurante_id: restauranteId,
      nombre,
      min_seleccion,
      max_seleccion,
      es_obligatorio,
    })
  );
});

const actualizarGrupo = asyncHandler(async (req, res) => {
  res.json(await modificadoresService.actualizarGrupo(req.params.id, req.body, resolveRestauranteId(req)));
});

const eliminarGrupo = asyncHandler(async (req, res) => {
  await modificadoresService.eliminarGrupo(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

const crearOpcion = asyncHandler(async (req, res) => {
  res.status(201).json(await modificadoresService.crearOpcion(req.body, resolveRestauranteId(req)));
});

const actualizarOpcion = asyncHandler(async (req, res) => {
  res.json(
    await modificadoresService.actualizarOpcion(req.params.id, req.body, resolveRestauranteId(req))
  );
});

const eliminarOpcion = asyncHandler(async (req, res) => {
  await modificadoresService.eliminarOpcion(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

module.exports = {
  listarGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  crearOpcion,
  actualizarOpcion,
  eliminarOpcion,
};
