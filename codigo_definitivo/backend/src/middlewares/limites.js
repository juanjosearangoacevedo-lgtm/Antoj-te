const { rateLimit } = require('express-rate-limit');

// Frenos de tasa.
//
// Por que NO hay un limite global sobre /api: el tablero de cocina consulta
// pedidos cada 5 s, o sea ~180 peticiones por cuarto de hora POR DISPOSITIVO, y
// todas las tablets de un restaurante salen por la misma IP. Un limite global
// bien puesto para frenar a un atacante dejaria fuera a la cocina en hora
// punta, y una cocina que deja de recibir comandas es una caida en toda regla.
// El limite general va en el borde (Cloudflare) cuando exista el dominio; aqui
// se frena lo que de verdad se abusa y no lo usa nadie en bucle.

const respuesta = (mensaje) => (req, res) =>
  res.status(429).json({ error: true, message: mensaje });

// Login: el freno importante. `skipSuccessfulRequests` hace que solo cuenten los
// intentos FALLIDOS, asi que a quien sabe su clave no le pasa nada aunque entre
// y salga treinta veces, y a quien la esta adivinando se le acaba en diez.
//
// Sin esto, /api/auth/login aceptaba intentos ilimitados contra bcrypt en un
// servidor de 1 vCPU: era fuerza bruta y denegacion de servicio con el mismo
// boton.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados intentos de acceso. Espera unos minutos e intenta de nuevo.'),
});

// Escrituras publicas del comensal (carrito, eventos, favoritos, checkout).
// Holgado a proposito: un comensal real hace unas pocas por minuto, asi que 60
// no le estorba ni en el peor de los casos, pero corta en seco el llenado
// automatizado de la base desde una sola fuente.
const limiteEscrituraPublica = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas peticiones. Espera un momento.'),
});

// Subida de video: cada una abre un hueco en Bunny, que se factura. Un admin
// sube unos pocos platos al dia; 20 por hora es de sobra y evita que una cuenta
// comprometida infle la factura del mes.
const limiteSubidaVideo = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Has iniciado demasiadas subidas de video. Intenta mas tarde.'),
});

// Cambio de contraseña propia. Pide la ACTUAL, asi que sin freno es un oraculo
// para adivinarla: se prueban claves contra este endpoint igual que contra el
// login, pero saltandose limiteLogin. Cuenta solo los intentos fallidos, por lo
// mismo que alli.
const limiteCambioPassword = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados intentos. Espera unos minutos e intenta de nuevo.'),
});

// Pedir enlaces de recuperación: cada uno puede mandar un correo, que cuesta y
// que molesta a su destinatario. Por IP; el service además limita a 3 por
// usuario y hora, que es lo que protege a la víctima si el ataque viene de
// muchas IPs.
const limiteRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.'),
});

// Usar un enlace. Con 256 bits de token adivinarlo es imposible, pero cada
// intento válido cuesta un bcrypt en un servidor de 1 vCPU: el freno es contra
// la denegación de servicio, no contra la fuerza bruta.
const limiteRestablecer = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados intentos. Espera unos minutos e intenta de nuevo.'),
});

module.exports = {
  limiteRecuperacion,
  limiteRestablecer,
  limiteLogin,
  limiteEscrituraPublica,
  limiteSubidaVideo,
  limiteCambioPassword,
};
