const bcrypt = require('bcryptjs');
const authModel = require('../models/auth.model');
const { sign } = require('../utils/jwt');
const { UnauthorizedError, BadRequestError } = require('../errors');
const { featuresDeRestaurante } = require('../middlewares/features');
const sesiones = require('./sesiones.service');
const suscripciones = require('./suscripciones.service');

// Estado de la membresía del restaurante (prueba, por vencer, vencida, gracia).
// Vive en services/suscripciones.service.js; aquí solo se reexpone para el login
// y /auth/me, que es de donde lo lee el panel.
const estadoSuscripcion = (restauranteId) => suscripciones.estado(restauranteId);

// El superadmin tiene todas las features; el resto depende del plan de su restaurante
const contextoPlan = async (usuario) => {
  if (usuario.role_nombre === 'superadmin') {
    return {
      plan: null,
      features: ['menu', 'personalizacion', 'carrito', 'kds'],
      estado_restaurante: null,
      suscripcion: null,
    };
  }
  const info = await featuresDeRestaurante(usuario.restaurante_id);
  return {
    plan: info ? { id: info.plan_id, nombre: info.plan_nombre } : null,
    features: info ? info.features : [],
    estado_restaurante: info ? info.estado : null,
    suscripcion: await estadoSuscripcion(usuario.restaurante_id),
  };
};

const login = async (email, password) => {
  const usuario = await authModel.buscarUsuarioPorEmail(email);
  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no revelamos
  // qué correos están registrados.
  if (!usuario) throw new UnauthorizedError('Credenciales invalidas');

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) throw new UnauthorizedError('Credenciales invalidas');

  const payload = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    restaurante_id: usuario.restaurante_id,
    role_id: usuario.role_id,
    role_nombre: usuario.nombre_rol,
    // Versión de sesión: si cambia en la base (clave o rol cambiados), este
    // token deja de valer. Ver services/sesiones.service.js.
    sv: Number(usuario.sesion_version ?? 0),
  };

  const token = sign(payload);
  const contexto = await contextoPlan(payload);
  return { token, usuario: payload, ...contexto };
};

// Rondas de bcrypt: las mismas que usa usuarios.service, para que un hash no se
// distinga de otro por su coste.
const RONDAS_BCRYPT = 10;

/**
 * Cambia la contraseña del propio usuario.
 *
 * Exige la ACTUAL aunque el token ya identifique a quien llama. Sin esa
 * comprobación, cualquiera con el token —robado, o un portátil desbloqueado un
 * minuto— se queda con la cuenta para siempre poniéndole otra clave.
 *
 * Cambiarla cierra TODAS las sesiones abiertas de la cuenta (el caso típico: te
 * robaron la clave y la cambias para echar al intruso). La de quien la cambia
 * sigue viva porque recibe un token nuevo en la respuesta.
 */
const cambiarPassword = async (sesion, actual, nueva) => {
  const usuarioId = sesion.id;
  const usuario = await authModel.passwordPorId(usuarioId);
  // El token es válido pero el usuario ya no existe: se le trata como no
  // autenticado, no como un 404, para no confirmar ids ajenos.
  if (!usuario) throw new UnauthorizedError('Credenciales invalidas');

  const coincide = await bcrypt.compare(actual, usuario.password_hash);
  // 400 y no 401: quien llama SÍ está autenticado, solo tecleó mal un campo. El
  // frontend trata cualquier 401 de una petición con sesión como "sesión
  // caducada" y manda a iniciar sesión: un error de tecleo no debe echar a nadie.
  if (!coincide) throw new BadRequestError('La contraseña actual no es correcta');

  await authModel.guardarPassword(usuarioId, await bcrypt.hash(nueva, RONDAS_BCRYPT));
  await sesiones.revocar(usuarioId);

  // El token nuevo lleva la versión recién subida; el resto del payload no
  // cambia. `iat` y `exp` se descartan para que sign() ponga los suyos.
  const { iat, exp, ...datos } = sesion;
  const version = await sesiones.versionActual(usuarioId);
  return { cambiada: true, token: sign({ ...datos, sv: version }) };
};

module.exports = { login, cambiarPassword, contextoPlan, estadoSuscripcion };
