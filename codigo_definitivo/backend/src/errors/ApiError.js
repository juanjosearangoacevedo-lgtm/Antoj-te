// Error con significado HTTP. Lo entiende `middlewares/errorHandler.js`, que lo
// traduce a la respuesta { error, message, details } que consume el frontend.
// Cualquier otro error que llegue al handler se responde como 500.
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = ApiError;
