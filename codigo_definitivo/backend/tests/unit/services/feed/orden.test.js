const test = require('node:test');
const assert = require('node:assert');

const orden = require('../../../../src/services/feed/orden');

// Un plato de mentira con lo que mira el feed.
const plato = (id, restaurante, extra = {}) => ({
  id,
  restaurante_id: restaurante,
  restaurante_slug: `r${restaurante}`,
  categoria: 'Postres',
  categoria_normalizada: 'postres',
  precio: 20000,
  moneda: 'COP',
  nivel_picante: 0,
  recomendado_chef: false,
  ...extra,
});

const restaurantesDe = (lista) => lista.map((p) => p.restaurante_id);

// --- Antojos ---

test('los antojos se normalizan, se ordenan y se agrupan por tipo', () => {
  const a = orden.parsearAntojos(['precio:25000', 'categoria:Platos  Fuertes', 'chef', 'precio:25000']);
  assert.deepStrictEqual(a.validos, ['categoria:platos fuertes', 'chef', 'precio:25000']);
  assert.deepStrictEqual([...a.porTipo.keys()], ['categoria', 'chef', 'precio']);
});

// Una app vieja no debe quedarse sin feed porque el backend aún no entiende un antojo nuevo.
test('un antojo desconocido o mal escrito no filtra', () => {
  const a = orden.parsearAntojos(['ocasion:cumpleanos', 'precio:caro', 'sabor:dulce', 'chef:si']);
  assert.deepStrictEqual(a.validos, []);
  const platos = [plato(1, 1), plato(2, 2)];
  assert.strictEqual(orden.filtrar(platos, a.porTipo).length, 2);
});

test('el mismo conjunto de antojos en otro orden da la misma clave', () => {
  assert.strictEqual(orden.parsearAntojos(['chef', 'sabor:picante']).clave, orden.parsearAntojos(['sabor:picante', 'chef']).clave);
});

test('dentro de un tipo basta una opción; entre tipos hay que cumplirlas todas', () => {
  const platos = [
    plato(1, 1, { categoria_normalizada: 'postres', precio: 12000 }),
    plato(2, 1, { categoria_normalizada: 'bebidas', precio: 8000 }),
    plato(3, 1, { categoria_normalizada: 'postres', precio: 30000 }),
    plato(4, 1, { categoria_normalizada: 'entradas', precio: 9000 }),
  ];
  const a = orden.parsearAntojos(['categoria:postres', 'categoria:bebidas', 'precio:15000']);
  assert.deepStrictEqual(
    orden.filtrar(platos, a.porTipo).map((p) => p.id),
    [1, 2]
  );
});

test('picante, suave, chef y restaurante filtran con los datos reales', () => {
  const platos = [
    plato(1, 1, { nivel_picante: 2, recomendado_chef: true }),
    plato(2, 2, { nivel_picante: 0 }),
  ];
  const ids = (antojos) => orden.filtrar(platos, orden.parsearAntojos(antojos).porTipo).map((p) => p.id);
  assert.deepStrictEqual(ids(['sabor:picante']), [1]);
  assert.deepStrictEqual(ids(['sabor:suave']), [2]);
  assert.deepStrictEqual(ids(['chef']), [1]);
  assert.deepStrictEqual(ids(['restaurante:R2']), [2]);
});

// "Hasta $25.000" no significa nada en dólares (APP_MOVIL.md R18).
test('el tope de precio solo aplica a platos en pesos', () => {
  const platos = [plato(1, 1, { precio: 10, moneda: 'USD' }), plato(2, 2, { precio: 10000 })];
  const a = orden.parsearAntojos(['precio:15000']);
  assert.deepStrictEqual(
    orden.filtrar(platos, a.porTipo).map((p) => p.id),
    [2]
  );
});

// --- Intercalado ---

test('nunca pone dos platos seguidos del mismo restaurante si hay alternativa', () => {
  // Ya ordenados por recencia: el restaurante 1 publicó mucho de golpe.
  const lista = [plato(1, 1), plato(2, 1), plato(3, 1), plato(4, 2), plato(5, 3), plato(6, 2)];
  const r = restaurantesDe(orden.intercalar(lista));
  for (let i = 1; i < r.length; i++) {
    const quedanOtros = r.slice(i).some((x) => x !== r[i - 1]);
    if (quedanOtros) assert.notStrictEqual(r[i], r[i - 1], `posición ${i}: ${r.join(',')}`);
  }
});

test('el intercalado conserva todos los platos y el orden dentro de cada restaurante', () => {
  const lista = [plato(1, 1), plato(2, 1), plato(3, 2), plato(4, 1), plato(5, 2)];
  const salida = orden.intercalar(lista);
  assert.deepStrictEqual(
    salida.map((p) => p.id).sort((a, b) => a - b),
    [1, 2, 3, 4, 5]
  );
  const del1 = salida.filter((p) => p.restaurante_id === 1).map((p) => p.id);
  assert.deepStrictEqual(del1, [1, 2, 4]);
});

test('con un solo restaurante los platos van seguidos, en su orden', () => {
  const lista = [plato(1, 7), plato(2, 7), plato(3, 7)];
  assert.deepStrictEqual(
    orden.intercalar(lista).map((p) => p.id),
    [1, 2, 3]
  );
});

// Es lo que permite paginar con un cursor sin repetir: la misma entrada da la misma salida.
test('el intercalado es determinista', () => {
  const lista = Array.from({ length: 40 }, (_, i) => plato(i + 1, (i * 7) % 4));
  assert.deepStrictEqual(
    orden.intercalar(lista).map((p) => p.id),
    orden.intercalar([...lista]).map((p) => p.id)
  );
});

// --- Cursor ---

test('el cursor va y vuelve con su corte y su desplazamiento', () => {
  const clave = orden.parsearAntojos(['chef']).clave;
  const cursor = orden.codificarCursor({ corte: '2026-10-12 21:00:00', desplazamiento: 24, clave });
  assert.deepStrictEqual(orden.decodificarCursor(cursor, clave), { corte: '2026-10-12 21:00:00', desplazamiento: 24 });
});

// Si la app cambió los antojos sin empezar de cero, seguir con ese cursor daría
// platos repetidos o saltados: se rechaza y la app pide la primera página.
test('un cursor de otros antojos no sirve', () => {
  const cursor = orden.codificarCursor({ corte: '2026-10-12 21:00:00', desplazamiento: 12, clave: 'chef' });
  assert.strictEqual(orden.decodificarCursor(cursor, 'sabor:picante'), null);
});

test('un cursor manipulado o basura se rechaza', () => {
  const clave = '';
  const falso = Buffer.from(JSON.stringify({ v: 1, c: "2026-10-12' OR 1=1", o: 0, k: 'x' })).toString('base64url');
  assert.strictEqual(orden.decodificarCursor(falso, clave), null);
  assert.strictEqual(orden.decodificarCursor('esto-no-es-un-cursor', clave), null);
  const negativo = orden.codificarCursor({ corte: '2026-10-12 21:00:00', desplazamiento: -5, clave });
  assert.strictEqual(orden.decodificarCursor(negativo, clave), null);
});

// --- Opciones ---

test('las opciones solo ofrecen lo que algún plato cumple', () => {
  const platos = [
    plato(1, 1, { categoria: 'Postres', precio: 12000, recomendado_chef: true }),
    plato(2, 1, { categoria: 'postres ', categoria_normalizada: 'postres', precio: 30000, nivel_picante: 1 }),
    plato(3, 2, { categoria: 'Bebidas', categoria_normalizada: 'bebidas', precio: 50000, moneda: 'USD' }),
  ];
  const o = orden.opciones(platos, [{ slug: 'r1' }, { slug: 'r2' }]);
  assert.deepStrictEqual(o.categorias, [
    { id: 'categoria:postres', nombre: 'Postres', total: 2 },
    { id: 'categoria:bebidas', nombre: 'Bebidas', total: 1 },
  ]);
  assert.strictEqual(o.chef, 1);
  assert.deepStrictEqual(o.sabor, { picante: 1, suave: 2 });
  // El plato en dólares no cuenta para los topes en pesos; 15.000 solo tiene uno.
  assert.deepStrictEqual(o.precio.topes, [
    { valor: 15000, total: 1 },
    { valor: 25000, total: 1 },
    { valor: 40000, total: 2 },
  ]);
  assert.strictEqual(o.total_restaurantes, 2);
});
