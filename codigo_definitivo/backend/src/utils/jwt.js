const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Sin JWT_SECRET la aplicacion NO arranca.
//
// Antes habia un `|| 'change_me'`. Parecia comodo y era una bomba de relojeria:
// si la variable faltaba —un .env mal copiado, un docker-compose sin la linea—
// el servidor arrancaba igual, en silencio, firmando los tokens con una cadena
// publicada en el repositorio, y cualquiera podria haberse emitido un JWT de
// superadmin. Un arranque fallido y ruidoso es mejor que uno exitoso e inseguro.
//
// La comprobacion vive en asegurarConfiguracion(), que llama server.js al
// arrancar, y NO en la carga del modulo. Si reventara al hacer require, este
// archivo seria imposible de importar sin montar el entorno completo: las
// pruebas no podrian probarlo. Lo que tiene que negarse a arrancar es la
// APLICACION, no el archivo.
const LONGITUD_MINIMA = 32;

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Se lee en cada uso, no una vez al cargar: asi el arranque puede validar y las
// pruebas pueden fijar su propio secreto antes de firmar.
function secreto() {
  const valor = process.env.JWT_SECRET;
  if (!valor) throw new Error('JWT_SECRET no esta definido');
  return valor;
}

function asegurarConfiguracion() {
  const valor = process.env.JWT_SECRET;
  if (!valor || valor.length < LONGITUD_MINIMA) {
    throw new Error(
      `JWT_SECRET ausente o demasiado corto (minimo ${LONGITUD_MINIMA} caracteres). ` +
        'Generar uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
}

function sign(payload) {
  return jwt.sign(payload, secreto(), { expiresIn: EXPIRES_IN });
}

// algorithms fijo: sin esta lista, jsonwebtoken acepta el algoritmo que declare
// la cabecera del propio token, que es como se cuelan los ataques de tipo
// "alg: none" y la confusion HS256/RS256.
function verify(token) {
  return jwt.verify(token, secreto(), { algorithms: ['HS256'] });
}

// Clave derivada de JWT_SECRET para un uso concreto. Cada uso tiene su propia
// etiqueta, así que una clave nunca sirve para otra cosa, y no hace falta una
// variable de entorno por cada una: rotar JWT_SECRET las rota todas.
function derivarClave(etiqueta) {
  return crypto.createHmac('sha256', secreto()).update(etiqueta).digest();
}

// --- Tokens de acceso del comensal (app móvil) ---
//
// Se firman con una clave DERIVADA, no con JWT_SECRET. Es lo que separa los dos
// mundos: un token de comensal no verifica en `verify` (el del staff), y un
// token de staff no verifica en `verificarComensal`, aunque algún día un
// middleware olvidara mirar la audiencia. Sin esto, `authenticate` aceptaba
// cualquier JWT firmado con el secreto y buscaba su `id` en `usuarios`: el
// comensal 5 habría pasado por el empleado 5.
//
// Duran 15 minutos: la app los renueva con el refresh token, que sí se puede
// revocar uno a uno (ver services/sesionesComensal.service.js).
const AUDIENCIA_COMENSAL = 'bitemo-app';
const VIGENCIA_COMENSAL_SEGUNDOS = 15 * 60;

const claveComensal = () => derivarClave('bitemo:tokens-comensal:v1');

function firmarComensal(payload) {
  return jwt.sign(payload, claveComensal(), {
    expiresIn: VIGENCIA_COMENSAL_SEGUNDOS,
    audience: AUDIENCIA_COMENSAL,
  });
}

function verificarComensal(token) {
  return jwt.verify(token, claveComensal(), {
    algorithms: ['HS256'],
    audience: AUDIENCIA_COMENSAL,
  });
}

module.exports = {
  sign,
  verify,
  asegurarConfiguracion,
  derivarClave,
  firmarComensal,
  verificarComensal,
  VIGENCIA_COMENSAL_SEGUNDOS,
};
