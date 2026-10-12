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

module.exports = { sign, verify, asegurarConfiguracion };
