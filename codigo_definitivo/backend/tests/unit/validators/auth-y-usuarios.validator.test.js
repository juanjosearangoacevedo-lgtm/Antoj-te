const test = require('node:test');
const assert = require('node:assert');

const authV = require('../../../src/validators/auth.validator');
const usuariosV = require('../../../src/validators/usuarios.validator');
const restaurantesV = require('../../../src/validators/restaurantes.validator');

test('login exige email y password', () => {
  assert.strictEqual(authV.login.safeParse({}).success, false);
  assert.strictEqual(authV.login.safeParse({ email: 'a@b.com' }).success, false);
  assert.strictEqual(authV.login.safeParse({ password: 'x' }).success, false);
  assert.strictEqual(authV.login.safeParse({ email: 'a@b.com', password: 'x' }).success, true);
});

test('login rechaza un email con formato invalido', () => {
  const r = authV.login.safeParse({ email: 'noesunemail', password: 'x' });
  assert.strictEqual(r.success, false);
  assert.match(r.error.issues[0].message, /email/i);
});

test('crear usuario exige nombre, email, password y role_id', () => {
  const completo = { nombre: 'Ana', email: 'ana@bitemo.com', password: 'secreto123', role_id: 2 };
  assert.strictEqual(usuariosV.crear.safeParse(completo).success, true);

  for (const campo of Object.keys(completo)) {
    const incompleto = { ...completo };
    delete incompleto[campo];
    assert.strictEqual(usuariosV.crear.safeParse(incompleto).success, false, `sin ${campo} deberia fallar`);
  }
});

// Subido de 6 a 8 el 2026-08-06: la auditoría encontró claves débiles activas en
// producción y seis caracteres se agotan por fuerza bruta en minutos. El mínimo
// vive en validators/comunes.js y lo comparten crear, actualizar y el cambio de
// contraseña propia.
test('la contraseña necesita al menos 8 caracteres', () => {
  const base = { nombre: 'Ana', email: 'ana@bitemo.com', role_id: 2 };
  assert.strictEqual(usuariosV.crear.safeParse({ ...base, password: '1234567' }).success, false);
  assert.strictEqual(usuariosV.crear.safeParse({ ...base, password: '12345678' }).success, true);
});

test('el estado del restaurante solo admite los tres validos', () => {
  for (const estado of ['pendiente', 'activo', 'suspendido']) {
    assert.strictEqual(restaurantesV.cambiarEstado.safeParse({ estado }).success, true);
  }
  assert.strictEqual(restaurantesV.cambiarEstado.safeParse({ estado: 'eliminado' }).success, false);
  assert.strictEqual(restaurantesV.cambiarEstado.safeParse({}).success, false);
});

test('cambiarPlan exige un plan_id positivo', () => {
  assert.strictEqual(restaurantesV.cambiarPlan.safeParse({ plan_id: 2 }).success, true);
  assert.strictEqual(restaurantesV.cambiarPlan.safeParse({ plan_id: '2' }).success, true, 'debe coercionar');
  assert.strictEqual(restaurantesV.cambiarPlan.safeParse({ plan_id: 0 }).success, false);
  assert.strictEqual(restaurantesV.cambiarPlan.safeParse({}).success, false);
});

// MiRestaurantePage manda exactamente esto al guardar.
test('actualizar restaurante acepta el payload del panel', () => {
  const r = restaurantesV.actualizar.safeParse({ nombre: 'Demo Bite Motion', logo_url: null, moneda: 'COP' });
  assert.strictEqual(r.success, true, JSON.stringify(r.error?.issues));
  assert.strictEqual(r.data.moneda, 'COP');
});
