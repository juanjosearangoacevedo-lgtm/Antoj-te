import test from 'node:test';
import assert from 'node:assert';

import {
  categorias,
  construirGrupos,
  delChef,
  filtrar,
  normalizar,
  opcionesElegibles,
  seleccionVigente,
} from '../../src/features/menu/logica/antojos.js';

// La carta llega de la API con el precio como texto y los booleanos de MySQL
// como 0/1; la carta de demostración trae números y booleanos. Las dos valen.
const plato = (parcial) => ({
  nombre: `Plato ${parcial.id}`,
  descripcion: null,
  precio: '20000.00',
  nivel_picante: 0,
  recomendado_chef: 0,
  categoria: 'Platos Fuertes',
  ...parcial,
});

const PLATOS = [
  plato({ id: 1, categoria: 'Postres', precio: '14000.00', recomendado_chef: 1 }),
  plato({ id: 2, categoria: 'Postres', precio: 18000 }),
  plato({ id: 3, categoria: 'Bebidas', precio: '8000.00' }),
  plato({ id: 4, categoria: 'Entradas', precio: '22000.00', nivel_picante: 2 }),
  plato({ id: 5, categoria: 'Platos fuertes', precio: '46000.00', recomendado_chef: true }),
];

const ids = (platos) => platos.map((p) => p.id);
const pesos = (v) => `$${Number(v).toLocaleString('es-CO')}`;

test('sin antojos se ve toda la carta', () => {
  assert.strictEqual(filtrar(PLATOS, []).length, PLATOS.length);
});

test('dentro de un tipo suma opciones y entre tipos exige todas', () => {
  assert.deepStrictEqual(ids(filtrar(PLATOS, ['categoria:postres', 'categoria:bebidas'])), [1, 2, 3]);
  assert.deepStrictEqual(ids(filtrar(PLATOS, ['categoria:postres', 'precio:15000'])), [1]);
});

test('picante y chef salen de los datos, con texto o con números', () => {
  assert.deepStrictEqual(ids(filtrar(PLATOS, ['sabor:picante'])), [4]);
  assert.deepStrictEqual(ids(filtrar(PLATOS, ['chef'])), [1, 5]);
  assert.deepStrictEqual(ids(delChef(PLATOS)), [1, 5]);
});

test('las opciones "pronto" no filtran ni inventan resultados', () => {
  assert.strictEqual(filtrar(PLATOS, ['ocasion:cumpleanos']).length, PLATOS.length);
});

test('las categorías se agrupan sin mayúsculas ni tildes', () => {
  assert.strictEqual(normalizar('  Platos  Fuertes '), 'platos fuertes');
  assert.deepStrictEqual(
    categorias(PLATOS).map((c) => [c.nombre, c.total]),
    [
      ['Postres', 2],
      ['Bebidas', 1],
      ['Entradas', 1],
      ['Platos fuertes', 1],
    ]
  );
});

test('el presupuesto solo aparece en pesos colombianos', () => {
  const enPesos = construirGrupos(PLATOS, { moneda: 'COP', formatear: pesos });
  const precio = enPesos.find((g) => g.id === 'precio');
  assert.strictEqual(precio.opciones[0].etiqueta, 'Económico · hasta $15.000');

  const enDolares = construirGrupos(PLATOS, { moneda: 'USD', formatear: pesos });
  assert.strictEqual(enDolares.find((g) => g.id === 'precio'), undefined);
});

test('ocasiones, dietas e intenciones quedan como "pronto" y no se pueden elegir', () => {
  const grupos = construirGrupos(PLATOS);
  const pronto = grupos.filter((g) => g.pronto);
  assert.deepStrictEqual(
    pronto.map((g) => g.id),
    ['ocasion', 'dieta', 'intencion']
  );
  const elegibles = opcionesElegibles(grupos);
  assert.deepStrictEqual(seleccionVigente(['categoria:postres', 'ocasion:cumpleanos', 'categoria:sushi'], elegibles), [
    'categoria:postres',
  ]);
});
