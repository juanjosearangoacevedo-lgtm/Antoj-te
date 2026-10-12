const test = require('node:test');
const assert = require('node:assert');

const {
  agregarItem,
  actualizarItem,
  eliminarItem,
  checkout,
} = require('../../../src/validators/carrito.validator');

const mensaje = (resultado) => resultado.error?.issues?.[0]?.message;

test('agregarItem exige sesion_token', () => {
  const r = agregarItem.safeParse({ plato_id: 5 });
  assert.strictEqual(r.success, false);
  assert.strictEqual(mensaje(r), 'sesion_token es obligatorio');
});

test('agregarItem exige plato_id o combo_id', () => {
  const r = agregarItem.safeParse({ sesion_token: 'abc' });
  assert.strictEqual(r.success, false);
  assert.strictEqual(mensaje(r), 'Debes indicar plato_id o combo_id');
});

test('agregarItem no permite plato_id y combo_id juntos', () => {
  const r = agregarItem.safeParse({ sesion_token: 'abc', plato_id: 5, combo_id: 9 });
  assert.strictEqual(r.success, false);
  assert.strictEqual(mensaje(r), 'No puedes indicar plato_id y combo_id al mismo tiempo');
});

test('agregarItem rechaza cantidades que no tienen sentido', () => {
  for (const cantidad of [0, -3, 1.5]) {
    const r = agregarItem.safeParse({ sesion_token: 'abc', plato_id: 5, cantidad });
    assert.strictEqual(r.success, false, `cantidad ${cantidad} deberia rechazarse`);
  }
});

test('agregarItem asume cantidad 1 si no se indica', () => {
  const r = agregarItem.safeParse({ sesion_token: 'abc', plato_id: 5 });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.cantidad, 1);
});

test('agregarItem conserva los modificadores y las notas', () => {
  const r = agregarItem.safeParse({
    sesion_token: 'abc',
    plato_id: 5,
    cantidad: 2,
    notas_instrucciones: 'sin cebolla',
    modificadores: [1, 2, 3],
  });
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.data.modificadores, [1, 2, 3]);
  assert.strictEqual(r.data.notas_instrucciones, 'sin cebolla');
});

test('actualizarItem admite cambiar solo la cantidad', () => {
  const r = actualizarItem.safeParse({ sesion_token: 'abc', cantidad: 4 });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.cantidad, 4);
});

// El id de la linea no prueba de quien es: sin sesion_token, cualquiera podia
// editar o borrar el carrito de la mesa de al lado probando ids correlativos.
test('actualizarItem y eliminarItem exigen sesion_token', () => {
  const r = actualizarItem.safeParse({ cantidad: 4 });
  assert.strictEqual(r.success, false);
  assert.strictEqual(mensaje(r), 'sesion_token es obligatorio');

  assert.strictEqual(eliminarItem.safeParse({}).success, false);
  assert.strictEqual(eliminarItem.safeParse({ sesion_token: 'abc' }).success, true);
});

test('checkout exige sesion_token y deja las observaciones opcionales', () => {
  assert.strictEqual(checkout.safeParse({}).success, false);
  assert.strictEqual(checkout.safeParse({ sesion_token: 'abc' }).success, true);
  assert.strictEqual(
    checkout.safeParse({ sesion_token: 'abc', observaciones: 'sin picante' }).success,
    true
  );
});
