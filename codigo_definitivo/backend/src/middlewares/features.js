const featuresModel = require('../models/features.model');
const { ForbiddenError, NotFoundError } = require('../errors');

// Catálogo central de features de la plataforma (feature flags)
const FEATURES = {
  MENU: 'menu', // gestión básica de carta (todos los planes)
  PERSONALIZACION: 'personalizacion', // personalización visual (Intermedio+)
  CARRITO: 'carrito', // carrito y pedidos automáticos (Pro)
  KDS: 'kds', // panel de cocina en tiempo real (Pro)
};

// Cache en memoria: restaurante_id -> { estado, plan_id, plan_nombre, features, exp }
// Evita dos consultas por petición. Se invalida al cambiar el plan de un
// restaurante o las features de un plan.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function clearFeatureCache(restauranteId) {
  if (restauranteId) cache.delete(Number(restauranteId));
  else cache.clear();
}

// Devuelve { estado, plan_id, plan_nombre, features: [] } del restaurante
async function featuresDeRestaurante(restauranteId) {
  if (!restauranteId) return null;

  const key = Number(restauranteId);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit;

  const restaurante = await featuresModel.planDeRestaurante(key);
  if (!restaurante) return null;

  const info = {
    estado: restaurante.estado,
    plan_id: restaurante.plan_id,
    plan_nombre: restaurante.plan_nombre,
    features: await featuresModel.featuresDePlan(restaurante.plan_id),
    exp: Date.now() + CACHE_TTL_MS,
  };
  cache.set(key, info);
  return info;
}

// Middleware staff: exige que el plan del restaurante del usuario incluya la feature.
// El superadmin siempre pasa. Un restaurante 'pendiente' sí puede trabajar en su
// panel (aún no lo aprueban, pero va montando su carta); solo 'suspendido' bloquea.
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      if (req.user.role_nombre === 'superadmin') return next();

      const info = await featuresDeRestaurante(req.user.restaurante_id);
      if (!info) throw new ForbiddenError('Restaurante no encontrado');
      if (info.estado === 'suspendido') throw new ForbiddenError('El restaurante está suspendido');
      if (!info.features.includes(feature)) {
        throw new ForbiddenError(
          `Tu plan (${info.plan_nombre || 'sin plan'}) no incluye esta funcionalidad`
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// En las rutas públicas la exigencia es mayor: el menú del comensal solo se sirve
// si el restaurante está 'activo'.
function exigirPublico(info, feature) {
  if (!info || info.estado !== 'activo') throw new ForbiddenError('Restaurante no disponible');
  if (!info.features.includes(feature)) {
    throw new ForbiddenError('Esta funcionalidad no está disponible en este restaurante');
  }
}

// Middleware público: gating por feature usando el token QR (rutas /:token/...)
function requireFeaturePublic(feature) {
  return async (req, res, next) => {
    try {
      const restauranteId = await featuresModel.restauranteIdPorTokenQr(req.params.token);
      if (!restauranteId) throw new NotFoundError('Codigo QR invalido');
      exigirPublico(await featuresDeRestaurante(restauranteId), feature);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Middleware público: gating resolviendo desde una línea de carrito
// (rutas /carrito/detalle/:detalleId)
function requireFeatureDetallePublic(feature) {
  return async (req, res, next) => {
    try {
      const restauranteId = await featuresModel.restauranteIdPorDetalleCarrito(req.params.detalleId);
      if (!restauranteId) throw new NotFoundError('Linea de carrito no encontrada');
      exigirPublico(await featuresDeRestaurante(restauranteId), feature);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  FEATURES,
  featuresDeRestaurante,
  requireFeature,
  requireFeaturePublic,
  requireFeatureDetallePublic,
  clearFeatureCache,
};
