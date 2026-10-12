import test from 'node:test';
import assert from 'node:assert';

import { OPCIONES, GRUPOS, CLAVES_TEMA, mezclar, conAlfa, textoLegibleSobre, contraste } from '../../src/shared/tema/opciones.js';
import { aplicarTema, estilosDeTema, atributosDeTema } from '../../src/shared/tema/aplicarTema.js';

// ---------------------------------------------------------------- catálogo ---

test('cada opción pertenece a un grupo declarado', () => {
  const claves = new Set(GRUPOS.map((g) => g.clave));
  for (const o of OPCIONES) {
    assert.ok(claves.has(o.grupo), `la opción ${o.clave} apunta al grupo inexistente "${o.grupo}"`);
  }
});

test('no hay claves de tema repetidas', () => {
  assert.strictEqual(new Set(CLAVES_TEMA).size, CLAVES_TEMA.length);
});

test('toda opción de escala tiene traducción para cada valor que ofrece', () => {
  for (const o of OPCIONES.filter((x) => x.escala)) {
    for (const v of o.valores.filter((x) => x.valor !== '')) {
      assert.ok(
        o.escala[v.valor] !== undefined,
        `${o.clave}: el valor "${v.valor}" no tiene equivalente en la escala`
      );
    }
  }
});

// ------------------------------------------------------------- regresión ---
// Esta es LA regla que se rompió: un tema con campos vacíos pisaba el diseño
// de la plataforma en vez de heredarlo.

test('un tema vacío no escribe ninguna variable CSS', () => {
  const estilos = estilosDeTema({
    color_primario: '',
    color_fondo: null,
    layout_categorias: '',
    estilo_tarjetas: '',
    tipografia_titulos: '',
  });
  assert.deepStrictEqual(estilos, {}, 'los valores vacíos deben heredar el default de Bitemo');
});

test('un tema nulo o indefinido no rompe', () => {
  assert.deepStrictEqual(estilosDeTema(null), {});
  assert.deepStrictEqual(estilosDeTema(undefined), {});
  assert.deepStrictEqual(estilosDeTema({}), {});
});

test('solo se aplican las opciones realmente elegidas', () => {
  const estilos = estilosDeTema({ color_primario: '#3366ff', color_fondo: '' });
  assert.strictEqual(estilos['--c-primario'], '#3366ff');
  assert.strictEqual(estilos['--c-base'], undefined, 'color_fondo vacío no debe escribirse');
});

// -------------------------------------------------------------- derivadas ---

test('el acento genera su tono oscuro y su versión suave, no tres veces el mismo color', () => {
  const estilos = estilosDeTema({ color_primario: '#ff7a00' });
  assert.strictEqual(estilos['--c-primario'], '#ff7a00');
  assert.notStrictEqual(estilos['--c-primario-dim'], '#ff7a00', 'el tono oscuro debe diferenciarse');
  assert.notStrictEqual(estilos['--c-primario-soft'], '#ff7a00', 'el tono suave debe diferenciarse');
  assert.match(estilos['--accent-soft'], /^rgba\(/);
});

test('el fondo deriva las superficies y los bordes', () => {
  const estilos = estilosDeTema({ color_fondo: '#0a0a0b' });
  for (const v of ['--c-surface', '--c-surface2', '--c-line']) {
    assert.ok(estilos[v], `falta ${v}`);
    assert.notStrictEqual(estilos[v], '#0a0a0b', `${v} debe separarse del fondo para que se vean los bordes`);
  }
});

// El texto del botón se calcula para garantizar contraste: es accesibilidad,
// no una preferencia estética.
test('el texto del botón contrasta con el color elegido', () => {
  // Sobre el naranja de marca va texto OSCURO: blanco da 2.6:1 y no pasa AA.
  assert.strictEqual(estilosDeTema({ color_botones: '#ff7a00' })['--c-boton-texto'], '#1f1200');
  assert.strictEqual(estilosDeTema({ color_botones: '#111111' })['--c-boton-texto'], '#ffffff');
  assert.strictEqual(estilosDeTema({ color_botones: '#ffffff' })['--c-boton-texto'], '#1f1200');
});

test('el texto elegido siempre alcanza el contraste AA (4.5:1)', () => {
  const fondos = ['#ff7a00', '#111111', '#ffffff', '#3366ff', '#6e8f5c', '#d8482f', '#5cb8e4', '#e7a93c'];
  for (const fondo of fondos) {
    const texto = estilosDeTema({ color_botones: fondo })['--c-boton-texto'];
    const razon = contraste(fondo, texto);
    assert.ok(razon >= 4.5, `${fondo} con ${texto} solo da ${razon.toFixed(2)}:1`);
  }
});

// ---------------------------------------------------------------- escalas ---

test('las escalas traducen la palabra elegida a su valor CSS', () => {
  assert.strictEqual(estilosDeTema({ radio_esquinas: 'recto' })['--radio-tarjetas'], '0px');
  assert.strictEqual(estilosDeTema({ radio_esquinas: 'redondo' })['--radio-tarjetas'], '28px');
  assert.strictEqual(estilosDeTema({ sombras: 'ninguna' })['--sombra-md'], 'none');
  assert.strictEqual(estilosDeTema({ espaciado: 'amplio' })['--espaciado'], '2rem');
  assert.strictEqual(estilosDeTema({ altura_categoria: 'alta' })['--alto-categoria'], '14rem');
  assert.strictEqual(estilosDeTema({ forma_botones: 'pildora' })['--radio-boton'], '999px');
});

test('la velocidad ajusta también las duraciones rápida y lenta', () => {
  const estilos = estilosDeTema({ velocidad_animacion: 'rapida' });
  assert.strictEqual(estilos['--motion-base'], '110ms');
  assert.ok(parseInt(estilos['--motion-fast'], 10) < 110);
  assert.ok(parseInt(estilos['--motion-slow'], 10) > 110);
});

test('el rango se normaliza a la unidad que espera el CSS', () => {
  assert.strictEqual(estilosDeTema({ opacidad_overlay: 80 })['--overlay-categoria'], '0.8');
  assert.strictEqual(estilosDeTema({ opacidad_overlay: 0 })['--overlay-categoria'], '0');
});

// -------------------------------------------------------------- atributos ---

test('modo y animaciones viajan como atributos, no como variables', () => {
  const attrs = atributosDeTema({ modo: 'claro', animaciones: 'ninguna' });
  assert.strictEqual(attrs['data-modo'], 'claro');
  assert.strictEqual(attrs['data-animaciones'], 'ninguna');
});

test('un interruptor apagado es una elección, no un vacío', () => {
  assert.strictEqual(aplicarTema({ mostrar_precio_feed: 0 }, elementoFalso())['data-mostrar-precio-feed'], 'no');
  assert.strictEqual(aplicarTema({ mostrar_precio_feed: 1 }, elementoFalso())['data-mostrar-precio-feed'], 'si');
  assert.strictEqual(aplicarTema({ mostrar_precio_feed: null }, elementoFalso())['data-mostrar-precio-feed'], undefined);
});

// --------------------------------------------------------------- utilidades ---

test('mezclar interpola entre dos colores', () => {
  assert.strictEqual(mezclar('#000000', '#ffffff', 0), '#000000');
  assert.strictEqual(mezclar('#000000', '#ffffff', 1), '#ffffff');
  assert.strictEqual(mezclar('#000000', '#ffffff', 0.5), '#808080');
});

test('las utilidades de color toleran una entrada inválida', () => {
  assert.strictEqual(mezclar('no-es-color', '#fff', 0.5), 'no-es-color');
  assert.strictEqual(conAlfa('nada', 0.5), 'nada');
  assert.strictEqual(textoLegibleSobre('nada'), '#1f1200');
});

test('el hex de 3 dígitos se entiende igual que el de 6', () => {
  assert.strictEqual(mezclar('#f00', '#f00', 0.5), '#ff0000');
});

function elementoFalso() {
  return { style: { setProperty: () => {} }, setAttribute: () => {} };
}
