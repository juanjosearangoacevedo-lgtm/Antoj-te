const test = require('node:test');
const assert = require('node:assert');

const { crear, actualizar, setIngredientes, setGruposModificadores } = require('../../../src/validators/platos.validator');

const PLATO_MINIMO = { categoria_id: 2, nombre: 'Hamburguesa', video_url: 'https://cdn/x.m3u8' };

test('crear exige categoria_id, nombre y video_url', () => {
  assert.strictEqual(crear.safeParse(PLATO_MINIMO).success, true);
  for (const campo of Object.keys(PLATO_MINIMO)) {
    const incompleto = { ...PLATO_MINIMO };
    delete incompleto[campo];
    assert.strictEqual(crear.safeParse(incompleto).success, false, `sin ${campo} deberia fallar`);
  }
});

// Este es el riesgo real de meter Zod: que un campo se borre en silencio y el
// plato se guarde sin su video o sin su programación de chef.
test('crear conserva TODOS los campos que usa el service', () => {
  const completo = {
    ...PLATO_MINIMO,
    descripcion: 'Doble carne',
    precio: 32000,
    video_guid: 'guid-123',
    video_thumbnail_url: 'https://cdn/thumb.jpg',
    video_status: 'procesando',
    imagen_url: 'https://cdn/foto.jpg',
    orden: 3,
    nivel_picante: 2,
    recomendado_chef: true,
    recomendado_dias: '2,3,4',
    recomendado_hora_inicio: '12:00',
    recomendado_hora_fin: '15:30',
  };
  const r = crear.safeParse(completo);
  assert.strictEqual(r.success, true, JSON.stringify(r.error?.issues));
  for (const campo of Object.keys(completo)) {
    assert.ok(campo in r.data, `${campo} se perdio al validar`);
  }
});

test('nivel_picante va de 0 a 3', () => {
  assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, nivel_picante: 3 }).success, true);
  assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, nivel_picante: 4 }).success, false);
});

test('video_status solo admite los valores del ENUM de MySQL', () => {
  for (const estado of ['procesando', 'listo', 'error']) {
    assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, video_status: estado }).success, true);
  }
  assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, video_status: 'subiendo' }).success, false);
});

test('recomendado_dias acepta la convencion DAYOFWEEK y el vacio', () => {
  for (const dias of ['', '1', '2,3,4', '1,7']) {
    assert.strictEqual(
      crear.safeParse({ ...PLATO_MINIMO, recomendado_dias: dias }).success,
      true,
      `"${dias}" deberia aceptarse`
    );
  }
  for (const dias of ['8', 'lunes', '1;2']) {
    assert.strictEqual(
      crear.safeParse({ ...PLATO_MINIMO, recomendado_dias: dias }).success,
      false,
      `"${dias}" deberia rechazarse`
    );
  }
});

test('las horas admiten HH:MM y el vacio (vacio = sin franja)', () => {
  for (const hora of ['', '00:00', '23:59', '12:30:00']) {
    assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, recomendado_hora_inicio: hora }).success, true, hora);
  }
  assert.strictEqual(crear.safeParse({ ...PLATO_MINIMO, recomendado_hora_inicio: '25:00' }).success, false);
});

// Lo que hacen PlatosPage al reordenar, al activar/desactivar y el polling de Bunny.
test('actualizar admite cambios parciales de un solo campo', () => {
  for (const parcial of [{ orden: 5 }, { activo: false }, { video_status: 'listo' }, { nombre: 'Otro' }]) {
    const r = actualizar.safeParse(parcial);
    assert.strictEqual(r.success, true, `${JSON.stringify(parcial)}: ${JSON.stringify(r.error?.issues)}`);
  }
});

test('setIngredientes y setGruposModificadores exigen arreglos', () => {
  assert.strictEqual(setIngredientes.safeParse({ ingredientes: [] }).success, true);
  assert.strictEqual(
    setIngredientes.safeParse({ ingredientes: [{ ingrediente_id: 1, cantidad_usada: 0.5 }] }).success,
    true
  );
  assert.strictEqual(setIngredientes.safeParse({ ingredientes: 'no' }).success, false);

  assert.strictEqual(setGruposModificadores.safeParse({ grupo_ids: [1, 2] }).success, true);
  assert.strictEqual(setGruposModificadores.safeParse({ grupo_ids: 3 }).success, false);
});
