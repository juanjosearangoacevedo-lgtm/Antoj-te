const ApiError = require('./ApiError');

// Subclases por código HTTP: evitan repetir el número en cada `throw` y hacen
// que el service se lea como lo que significa, no como un status.
//   throw new NotFoundError('Plato no encontrado')
class BadRequestError extends ApiError {
  constructor(message = 'Solicitud invalida', details = null) {
    super(400, message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'No autenticado', details = null) {
    super(401, message, details);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'No tienes permisos para realizar esta accion', details = null) {
    super(403, message, details);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Recurso no encontrado', details = null) {
    super(404, message, details);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'El recurso ya existe', details = null) {
    super(409, message, details);
  }
}

class TooManyRequestsError extends ApiError {
  constructor(message = 'Demasiadas solicitudes, intenta mas tarde', details = null) {
    super(429, message, details);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
};
