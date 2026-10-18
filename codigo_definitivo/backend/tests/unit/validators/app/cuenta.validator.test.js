const test = require('node:test');
const assert = require('node:assert');

const v = require('../../../../src/validators/app/cuenta.validator');

test('actualizar la cuenta exige al menos un cambio', () => {
  const r = v.actualizar.safeParse({});
  assert.ok(!r.success);
  assert.strictEqual(r.error.issues[0].message, 'No enviaste ningún cambio');
});

test('se puede borrar el telefono mandandolo en null o vacio', () => {
  assert.strictEqual(v.actualizar.parse({ telefono: null }).telefono, null);
  assert.strictEqual(v.actualizar.parse({ telefono: '' }).telefono, null);
});

// El correo no se edita desde aquí: cambiarlo exige verificar el nuevo.
test('actualizar descarta el correo y cualquier campo no editable', () => {
  const r = v.actualizar.parse({ nombre: 'Ana', email: 'otra@correo.com', sesion_version: 3 });
  assert.deepStrictEqual(Object.keys(r), ['nombre']);
});

test('la clave nueva debe ser distinta de la actual', () => {
  const r = v.cambiarPassword.safeParse({ actual: 'clave-segura-1', nueva: 'clave-segura-1' });
  assert.ok(!r.success);
  assert.deepStrictEqual(r.error.issues[0].path, ['nueva']);
});

test('borrar la cuenta pide la clave', () => {
  assert.ok(!v.eliminar.safeParse({}).success);
  assert.ok(v.eliminar.safeParse({ password: 'lo-que-sea' }).success);
});
