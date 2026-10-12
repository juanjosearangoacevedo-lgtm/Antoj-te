const test = require('node:test');
const assert = require('node:assert');

const { login, cambiarPassword, recuperar, restablecer } = require('../../../src/validators/auth.validator');

test('el login exige email con formato y password no vacio', () => {
  assert.strictEqual(login.safeParse({ email: 'a@b.co', password: 'x' }).success, true);
  assert.strictEqual(login.safeParse({ email: 'no-es-correo', password: 'x' }).success, false);
  assert.strictEqual(login.safeParse({ email: 'a@b.co', password: '' }).success, false);
});

// La contraseña ACTUAL no lleva minimo de longitud a proposito: es la que ya
// existe y puede ser mas corta que el minimo de hoy. Si se le exigiera 8, quien
// tenga una de 6 no podria cambiarla nunca, que es justo lo contrario de lo que
// queremos.
test('para cambiar la clave, la actual solo tiene que no estar vacia', () => {
  const ok = cambiarPassword.safeParse({ actual: 'corta', nueva: 'unaClaveLarga1' });
  assert.strictEqual(ok.success, true, JSON.stringify(ok.error?.issues));
  assert.strictEqual(cambiarPassword.safeParse({ actual: '', nueva: 'unaClaveLarga1' }).success, false);
});

test('la contraseña nueva exige al menos 8 caracteres', () => {
  assert.strictEqual(cambiarPassword.safeParse({ actual: 'vieja', nueva: '1234567' }).success, false);
  assert.strictEqual(cambiarPassword.safeParse({ actual: 'vieja', nueva: '12345678' }).success, true);
});

test('la contraseña nueva no puede ser igual a la actual', () => {
  const r = cambiarPassword.safeParse({ actual: 'lamismaclave', nueva: 'lamismaclave' });
  assert.strictEqual(r.success, false);
  assert.match(JSON.stringify(r.error.issues), /distinta/);
});

// --- Recuperar contraseña ---

test('recuperar exige un correo con formato válido', () => {
  assert.strictEqual(recuperar.safeParse({ email: 'ana@bitemo.com' }).success, true);
  assert.strictEqual(recuperar.safeParse({ email: 'no-es-correo' }).success, false);
  assert.strictEqual(recuperar.safeParse({}).success, false);
});

test('restablecer acepta un token base64url y una clave de 8 o más', () => {
  const token = 'a'.repeat(43);
  assert.strictEqual(restablecer.safeParse({ token, password: 'ClaveLarga1' }).success, true);
  assert.strictEqual(restablecer.safeParse({ token, password: 'corta' }).success, false);
});

test('restablecer rechaza tokens con caracteres fuera de base64url', () => {
  assert.strictEqual(
    restablecer.safeParse({ token: `${'a'.repeat(30)}/../x`, password: 'ClaveLarga1' }).success,
    false
  );
  assert.strictEqual(restablecer.safeParse({ token: 'corto', password: 'ClaveLarga1' }).success, false);
});
