const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const platosService = require('../services/platos.service');

const listar = asyncHandler(async (req, res) => {
  res.json(await platosService.listar(resolveRestauranteId(req), req.query.categoria_id));
});

const obtener = asyncHandler(async (req, res) => {
  res.json(await platosService.obtener(req.params.id, resolveRestauranteId(req)));
});

// Ruta pública del feed: sin sesión, así que no hay tenant que resolver y el
// filtrado de publicado/activo lo pone el service.
const obtenerPublico = asyncHandler(async (req, res) => {
  res.json(await platosService.obtenerPublico(req.params.platoId));
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(await platosService.crear(req.body, resolveRestauranteId(req)));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(await platosService.actualizar(req.params.id, req.body, resolveRestauranteId(req)));
});

const eliminar = asyncHandler(async (req, res) => {
  await platosService.eliminar(req.params.id, resolveRestauranteId(req));
  res.status(204).send();
});

const setIngredientes = asyncHandler(async (req, res) => {
  await platosService.setIngredientes(
    req.params.id,
    req.body.ingredientes,
    resolveRestauranteId(req)
  );
  res.json({ ok: true });
});

const setGruposModificadores = asyncHandler(async (req, res) => {
  await platosService.setGruposModificadores(
    req.params.id,
    req.body.grupo_ids,
    resolveRestauranteId(req)
  );
  res.json({ ok: true });
});

// Crea el video en Bunny y devuelve la credencial firmada para que el frontend
// suba el archivo DIRECTO (TUS). El archivo nunca pasa por este servidor.
const solicitarSubidaVideo = asyncHandler(async (req, res) => {
  const restauranteId = resolveRestauranteId(req);
  if (!restauranteId) throw new ApiError(400, 'No se pudo determinar el restaurante');
  res.json(await platosService.solicitarSubidaVideo(restauranteId, req.body?.titulo));
});

// Consulta el estado de transcodificación de un video en Bunny (polling desde el admin).
const estadoVideo = asyncHandler(async (req, res) => {
  res.json(await platosService.estadoVideo(req.params.guid));
});

const feedPublico = asyncHandler(async (req, res) => {
  res.json(await platosService.feedPublico(req.params.token));
});

const feedPorSlug = asyncHandler(async (req, res) => {
  res.json(await platosService.feedPorSlug(req.params.slug));
});

module.exports = {
  listar,
  obtener,
  obtenerPublico,
  crear,
  actualizar,
  eliminar,
  setIngredientes,
  setGruposModificadores,
  solicitarSubidaVideo,
  estadoVideo,
  feedPublico,
  feedPorSlug,
};
