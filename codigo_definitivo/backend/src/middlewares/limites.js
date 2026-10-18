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

// --- API de la app móvil (/api/app/v1) ---
//
// Instancias propias y no las del panel: cada `rateLimit` lleva su contador, y
// compartirlo haría que los errores de login de la app bloquearan el del staff.
//
// Cuidado con la IP en producción: detrás de Cloudflare, `req.ip` es la del nodo
// de Cloudflare mientras Nginx no restaure la IP real (real_ip). Con esa IP
// compartida, un límite estrecho castiga a todos los usuarios del nodo; por eso
// estos números son holgados y los topes finos van por cuenta, en el service.

// Techo general contra el abuso: una app normal hace unas pocas peticiones por
// minuto; 300 no estorba ni en el peor caso y corta un bucle desbocado.
const limiteApp = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas peticiones. Espera un momento.'),
});

// Crear cuentas en serie desde una misma fuente.
const limiteRegistroApp = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas cuentas creadas desde esta conexión. Intenta más tarde.'),
});

// Como el del panel, solo cuentan los intentos fallidos, pero con más margen: el
// panel lo usan unas pocas personas por restaurante, y la app, el público, que en
// redes móviles comparte IP con muchos otros. Contra adivinar claves de una
// cuenta concreta protege igual: 20 intentos por cuarto de hora no alcanzan.
const limiteLoginApp = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados intentos de acceso. Espera unos minutos e intenta de nuevo.'),
});

// Pedir códigos por correo: cada uno cuesta un envío y molesta al destinatario.
// Por IP; el service además limita a 3 por cuenta y hora.
const limiteCodigosApp = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas solicitudes de código. Espera unos minutos.'),
});

// Probar códigos o claves (restablecer, confirmar el correo, cambiar la clave,
// borrar la cuenta). Solo cuentan los fallidos, y los de todas esas rutas suman
// juntos. Es un freno secundario y por eso holgado: lo que protege un código es
// su tope de 5 intentos y el de 3 códigos por hora y cuenta (en el service). Con
// 10 se comprobó que tres o cuatro personas detrás de la misma IP se bloqueaban
// entre sí por simples errores de tecleo.
const limiteIntentosApp = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados intentos. Espera unos minutos e intenta de nuevo.'),
});

// --- Capa social y señales del feed (fase 2) ---

// "Me gusta" y guardados: cada toque es una escritura. Un dedo rápido hace
// varios por minuto; 120 no lo nota, y corta a quien inflaría contadores en bucle.
const limiteSocialApp = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Vas muy rápido. Espera un momento.'),
});

// Comentar. Por IP y holgado (redes móviles compartidas); el tope fino va por
// cuenta en el service (10 cada 10 minutos).
const limiteComentariosApp = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados comentarios desde esta conexión. Espera unos minutos.'),
});

// Reportar y bloquear: escasos por naturaleza. El freno evita que alguien use
// los reportes para tumbar comentarios ajenos en serie.
const limiteModeracionApp = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiados reportes seguidos. Intenta más tarde.'),
});

// Lotes de eventos: la app manda uno cada pocos segundos mientras se usa.
const limiteEventosApp = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuesta('Demasiadas peticiones. Espera un momento.'),
});

module.exports = {
  limiteSocialApp,
  limiteComentariosApp,
  limiteModeracionApp,
  limiteEventosApp,
  limiteRecuperacion,
  limiteRestablecer,
  limiteLogin,
  limiteEscrituraPublica,
  limiteSubidaVideo,
  limiteCambioPassword,
  limiteApp,
  limiteRegistroApp,
  limiteLoginApp,
  limiteCodigosApp,
  limiteIntentosApp,
};
