const test = require('node:test');
const assert = require('node:assert');

// El módulo lee JWT_SECRET al cargarse, así que se fija antes del require.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const {
  sign,
  verify,
  firmarComensal,
  verificarComensal,
  derivarClave,
  VIGENCIA_COMENSAL_SEGUNDOS,
} = require('../../../src/utils/jwt');

const USUARIO = {
  id: 7,
  nombre: 'Ana',
  email: 'ana@bitemo.com',
  restaurante_id: 3,
  role_id: 2,
  role_nombre: 'admin_restaurante',
};

test('un token firmado se puede verificar y conserva el payload', () => {
  const payload = verify(sign(USUARIO));
  for (const [campo, valor] of Object.entries(USUARIO)) {
    assert.strictEqual(payload[campo], valor, `se perdio ${campo} al ir y volver`);
  }
});

test('un token manipulado no verifica', () => {
  const token = sign(USUARIO);
  // Se altera el último carácter de la firma
  const roto = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a');
  assert.throws(() => verify(roto));
});

test('cualquier cosa que no sea un JWT falla', () => {
  assert.throws(() => verify('no-soy-un-token'));
  assert.throws(() => verify(''));
});

test('el restaurante_id viaja en el token: de ahi sale el aislamiento entre restaurantes', () => {
  const payload = verify(sign(USUARIO));
  assert.strictEqual(payload.restaurante_id, 3);
});

// --- Tokens del comensal (app movil) ---

const COMENSAL = { sub: '41', sv: 0, sid: 9 };

test('un token de comensal verifica con verificarComensal y lleva la audiencia de la app', () => {
  const payload = verificarComensal(firmarComensal(COMENSAL));
  assert.strictEqual(payload.sub, '41');
  assert.strictEqual(payload.sid, 9);
  assert.strictEqual(payload.aud, 'bitemo-app');
});

// Es la frontera entre los dos mundos. Sin ella, `authenticate` (staff) aceptaba
// cualquier JWT firmado con el secreto y buscaba su id en `usuarios`: el
// comensal 41 habria pasado por el empleado 41.
test('un token de comensal NO verifica como token de staff, ni al reves', () => {
  assert.throws(() => verify(firmarComensal(COMENSAL)), 'el staff no debe aceptar un token de comensal');
  assert.throws(() => verificarComensal(sign(USUARIO)), 'la app no debe aceptar un token de staff');
});

test('un token de staff firmado con la audiencia de la app tampoco pasa por comensal', () => {
  // Aunque alguien imitara la audiencia, la clave es otra: la separacion no
  // depende de que un middleware se acuerde de mirar `aud`.
  const jwt = require('jsonwebtoken');
  const imitado = jwt.sign(COMENSAL, process.env.JWT_SECRET, { audience: 'bitemo-app' });
  assert.throws(() => verificarComensal(imitado));
});

test('el token de comensal vence a los 15 minutos', () => {
  const { iat, exp } = verificarComensal(firmarComensal(COMENSAL));
  assert.strictEqual(exp - iat, VIGENCIA_COMENSAL_SEGUNDOS);
  assert.strictEqual(VIGENCIA_COMENSAL_SEGUNDOS, 15 * 60);
});

test('cada etiqueta deriva una clave distinta, y distinta del secreto', () => {
  const a = derivarClave('bitemo:uno');
  const b = derivarClave('bitemo:dos');
  assert.notDeepStrictEqual(a, b);
  assert.notStrictEqual(a.toString('utf8'), process.env.JWT_SECRET);
  assert.deepStrictEqual(derivarClave('bitemo:uno'), a, 'la misma etiqueta da siempre la misma clave');
});
