const temasModel = require('../models/temas.model');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../errors');
const { featuresDeRestaurante } = require('../middlewares/features');

const obtener = async (restauranteId) => {
  const tema = await temasModel.buscarPorRestaurante(restauranteId);
  // Un restaurante sin tema guardado usa el modo oscuro por defecto.
  return tema || { restaurante_id: Number(restauranteId), modo: 'oscuro' };
};

// Crea o actualiza el tema del restaurante con los campos permitidos que vengan en `datos`
const guardar = async (restauranteId, datos) => {
  const valores = temasModel.normalizar(datos);
  if (Object.keys(valores).length === 0) {
    throw new BadRequestError('No enviaste ningún campo de tema');
  }

  const existente = await temasModel.buscarPorRestaurante(restauranteId);
  if (existente) await temasModel.actualizar(restauranteId, valores);
  else await temasModel.crear(restauranteId, valores);

  return temasModel.buscarPorRestaurante(restauranteId);
};

// Lo común a las dos puertas de entrada (QR de mesa y slug público): features del
// plan y tema visual. Se comparte para que la vitrina no se vea distinta del menú
// de la mesa por haber duplicado la lógica.
async function envoltorio(base, extra) {
  const info = await featuresDeRestaurante(base.restaurante_id);
  const features = info ? info.features : [];

  // El tema solo se aplica si el plan incluye personalización
  const tema = features.includes('personalizacion')
    ? await temasModel.buscarPorRestaurante(base.restaurante_id)
    : null;

  return {
    restaurante: {
      id: base.restaurante_id,
      nombre: base.restaurante_nombre,
      logo_url: base.logo_url,
      moneda: base.moneda || 'COP',
    },
    plan: info ? { id: info.plan_id, nombre: info.plan_nombre } : null,
    features,
    tema,
    ...extra,
  };
}

// Público: configuración completa del restaurante al escanear el QR
// (datos del restaurante, features del plan y tema visual si el plan lo permite)
const configPublica = async (token) => {
  const base = await temasModel.contextoPorTokenQr(token);
  if (!base) throw new NotFoundError('Codigo QR invalido');
  if (base.estado !== 'activo') throw new ForbiddenError('Restaurante no disponible por el momento');

  return envoltorio(base, {
    mesa: { id: base.mesa_id, numero_mesa: base.numero_mesa },
    sucursal: { id: base.sucursal_id, nombre: base.sucursal_nombre },
  });
};

// Público: lo mismo pero entrando por /r/:slug. Devuelve `mesa: null` a propósito,
// y no omite la clave: el frontend distingue la vitrina del menú de mesa mirando
// justo eso, y una clave ausente y una nula se leen distinto en JavaScript.
const configPorSlug = async (slug) => {
  const base = await temasModel.contextoPorSlug(slug);
  if (!base) throw new NotFoundError('Restaurante no encontrado');
  if (base.estado !== 'activo') throw new ForbiddenError('Restaurante no disponible por el momento');

  const config = await envoltorio(base, { mesa: null, sucursal: null });
  config.restaurante.slug = base.slug;
  config.restaurante.descripcion = base.descripcion;
  config.restaurante.ciudad = base.ciudad;
  return config;
};

module.exports = { obtener, guardar, configPublica, configPorSlug };
