const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const {
  tokenAleatorio,
  hashToken,
  generarCodigo,
  hashCodigo,
  mismoHash,
} = require('../../../src/utils/codigos');

test('el refresh token son 32 bytes en base64url y no se repite', () => {
  const vistos = new Set();
  for (let i = 0; i < 200; i += 1) {
    const t = tokenAleatorio();
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    vistos.add(t);
  }
  assert.strictEqual(vistos.size, 200);
});

test('el hash del refresh token es SHA-256 en hex y es estable', () => {
  const t = tokenAleatorio();
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.strictEqual(hashToken(t), hashToken(t));
  assert.notStrictEqual(hashToken(t), hashToken(tokenAleatorio()));
});

test('el codigo tiene siempre 6 digitos, con ceros a la izquierda', () => {
  const vistos = new Set();
  for (let i = 0; i < 2000; i += 1) {
    const c = generarCodigo();
    assert.match(c, /^\d{6}$/);
    vistos.add(c);
  }
  // Con un millón de valores posibles, 2000 códigos casi nunca se repiten: si se
  // repitieran mucho, el generador no sería uniforme.
  assert.ok(vistos.size > 1990);
});

// Un código de 6 dígitos no puede guardarse con un SHA-256 pelado: se revierte
// probando el millón de valores. El HMAC usa una clave que no está en la base.
test('el hash del codigo depende de la clave del servidor, no solo del codigo', () => {
  const datos = { comensalId: 5, proposito: 'restablecer_clave', codigo: '123456' };
  const conClave = hashCodigo(datos);
  const shaPelado = require('crypto').createHash('sha256').update('5:restablecer_clave:123456').digest('hex');
  assert.match(conClave, /^[0-9a-f]{64}$/);
  assert.notStrictEqual(conClave, shaPelado);
});

test('el mismo codigo no vale para otra cuenta ni para otro proposito', () => {
  const base = { comensalId: 5, proposito: 'restablecer_clave', codigo: '123456' };
  const h = hashCodigo(base);
  assert.strictEqual(hashCodigo({ ...base }), h, 'debe ser determinista');
  assert.notStrictEqual(hashCodigo({ ...base, comensalId: 6 }), h);
  assert.notStrictEqual(hashCodigo({ ...base, proposito: 'verificar_correo' }), h);
  assert.notStrictEqual(hashCodigo({ ...base, codigo: '123457' }), h);
});

test('mismoHash compara en tiempo constante y no se deja enganar por vacios', () => {
  const h = hashToken('algo');
  assert.ok(mismoHash(h, h));
  assert.ok(!mismoHash(h, hashToken('otra cosa')));
  assert.ok(!mismoHash('', ''), 'dos vacios no son una coincidencia');
  assert.ok(!mismoHash(h, h.slice(0, 32)), 'longitudes distintas no coinciden');
  assert.ok(!mismoHash(null, undefined));
});
