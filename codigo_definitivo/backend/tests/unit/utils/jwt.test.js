const test = require('node:test');
const assert = require('node:assert');

// El módulo lee JWT_SECRET al cargarse, así que se fija antes del require.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { sign, verify } = require('../../../src/utils/jwt');

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
