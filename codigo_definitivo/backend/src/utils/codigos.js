const crypto = require('crypto');
const { derivarClave } = require('./jwt');

// Secretos de un solo uso del comensal: refresh tokens y códigos por correo.
// Son funciones puras (sin base) para poder probarlas una a una.

// --- Refresh tokens ---
//
// 256 bits de azar. En la base solo se guarda su SHA-256, igual que los enlaces
// de recuperación del staff: si se filtra la tabla de sesiones, no sirve para
// entrar a ninguna cuenta. Con 256 bits no hace falta nada más lento que un
// SHA-256: adivinarlo es imposible.
const tokenAleatorio = () => crypto.randomBytes(32).toString('base64url');

const hashToken = (token) => crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

// --- Códigos de 6 dígitos ---

const DIGITOS_CODIGO = 6;

// randomInt es uniforme; sacar el número de bytes al azar con % tendría sesgo.
const generarCodigo = () => String(crypto.randomInt(0, 10 ** DIGITOS_CODIGO)).padStart(DIGITOS_CODIGO, '0');

// Un código de 6 dígitos solo tiene un millón de valores: su SHA-256 pelado se
// revierte probándolos todos en un segundo. Por eso se guarda con HMAC y una
// clave que no vive en la base: quien lea un volcado de la tabla no recupera
// ningún código vivo. El comensal y el propósito van dentro del mensaje para que
// un código no valga para otra cuenta ni para otro fin.
function hashCodigo({ comensalId, proposito, codigo }) {
  return crypto
    .createHmac('sha256', derivarClave('bitemo:codigos-comensal:v1'))
    .update(`${comensalId}:${proposito}:${codigo}`)
    .digest('hex');
}

// Comparación en tiempo constante: con `===` el tiempo de respuesta delata
// cuántos caracteres coinciden.
function mismoHash(a, b) {
  const x = Buffer.from(String(a || ''), 'hex');
  const y = Buffer.from(String(b || ''), 'hex');
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = {
  DIGITOS_CODIGO,
  tokenAleatorio,
  hashToken,
  generarCodigo,
  hashCodigo,
  mismoHash,
};
