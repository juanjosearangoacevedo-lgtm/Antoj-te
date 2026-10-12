const { ApiError } = require('../errors');
const asyncHandler = require('../middlewares/asyncHandler');
const { resolveRestauranteId } = require('../middlewares/auth');
const temasService = require('../services/temas.service');

// Staff: obtener el tema del propio restaurante (superadmin puede indicar restaurante_id)
const obtener = asyncHandler(async (req, res) => {
  const restauranteId = resolveRestauranteId(req);
  if (!restauranteId) throw new ApiError(400, 'restaurante_id es obligatorio');
  res.json(await temasService.obtener(restauranteId));
});

// Staff: crear o actualizar el tema (protegido por feature 'personalizacion' en la ruta)
const guardar = asyncHandler(async (req, res) => {
  const restauranteId = resolveRestauranteId(req);
  if (!restauranteId) throw new ApiError(400, 'restaurante_id es obligatorio');
  res.json(await temasService.guardar(restauranteId, req.body));
});

// Público: configuración completa del restaurante al escanear el QR
const configPublica = asyncHandler(async (req, res) => {
  res.json(await temasService.configPublica(req.params.token));
});

// Público: la vitrina de /r/:slug, sin mesa de por medio.
const configPorSlug = asyncHandler(async (req, res) => {
  res.json(await temasService.configPorSlug(req.params.slug));
});

module.exports = { obtener, guardar, configPublica, configPorSlug };
