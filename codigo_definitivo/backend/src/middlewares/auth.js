const { verify } = require('../utils/jwt');
const { ApiError } = require('../errors');
const sesiones = require('../services/sesiones.service');
const suscripciones = require('../services/suscripciones.service');

// Verifica el JWT enviado en el header Authorization: Bearer <token>, y que la
// sesión no se haya revocado (contraseña cambiada, rol cambiado, usuario borrado:
// ver services/sesiones.service.js). Devuelve una promesa para poder esperarla
// en las pruebas; Express no la necesita.
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token no proporcionado'));
  }

  let payload;
  try {
    payload = verify(header.split(' ')[1]);
  } catch (err) {
    return next(new ApiError(401, 'Token invalido o expirado'));
  }

  try {
    if (!(await sesiones.vigente(payload))) {
      return next(new ApiError(401, 'Tu sesion ya no es valida. Vuelve a iniciar sesion.'));
    }
  } catch (err) {
    // La base no respondió: es un fallo del servidor, no del token.
    return next(err);
  }

  // Membresía vencida: el panel y la cocina se bloquean, salvo lo necesario para
  // salir del bloqueo (pagar) y para saber que se está bloqueado (/auth/me).
  // 402 y no 403: el frontend lo reconoce y manda a la pantalla de pago en vez
  // de mostrar "no tienes permisos". El superadmin no tiene membresía.
  if (payload.role_nombre !== 'superadmin' && payload.restaurante_id != null && !rutaSinMembresia(req)) {
    try {
      const membresia = await suscripciones.estadoCacheado(payload.restaurante_id);
      if (membresia?.vencida) {
        return next(
          new ApiError(402, 'Tu membresía está vencida. Renuévala para seguir usando el panel.', {
            codigo: 'SUSCRIPCION_VENCIDA',
          })
        );
      }
    } catch (err) {
      return next(err);
    }
  }

  req.user = payload;
  next();
}

// Rutas que siguen abiertas con la membresía vencida: la sesión (entrar, ver el
// propio estado, cambiar la clave) y el pago. Todo lo demás espera a que pague.
const RUTAS_SIN_MEMBRESIA = ['/api/auth/', '/api/pagos'];
const rutaSinMembresia = (req) =>
  RUTAS_SIN_MEMBRESIA.some((r) => (req.originalUrl || '').startsWith(r));

// Restringe una ruta a ciertos roles (nombre_rol de la tabla roles)
function authorize(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'No autenticado'));
    if (!rolesPermitidos.includes(req.user.role_nombre)) {
      return next(new ApiError(403, 'No tienes permisos para realizar esta accion'));
    }
    next();
  };
}

// El superadmin puede operar sobre cualquier restaurante (indicandolo por query/body/param).
// Cualquier otro rol queda restringido a su propio restaurante_id, tomado del token.
function resolveRestauranteId(req) {
  if (req.user.role_nombre === 'superadmin') {
    return req.query.restaurante_id || req.body.restaurante_id || req.params.restauranteId || null;
  }
  // Un rol de restaurante SIN restaurante_id no puede seguir: aguas abajo,
  // "sin tenant" significa "todos los tenants" (asi lo interpretan los models,
  // que omiten el AND restaurante_id cuando reciben null). Un usuario mal
  // sembrado o un token viejo se convertiria en un pase para leer la
  // plataforma entera. Se corta aqui, que es donde se decide el alcance.
  if (req.user.restaurante_id == null) {
    throw new ApiError(403, 'Tu usuario no esta asociado a ningun restaurante');
  }
  return req.user.restaurante_id;
}

module.exports = { authenticate, authorize, resolveRestauranteId };
