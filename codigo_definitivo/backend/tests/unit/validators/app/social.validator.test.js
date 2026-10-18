const test = require('node:test');
const assert = require('node:assert');

const social = require('../../../../src/validators/app/social.validator');
const eventos = require('../../../../src/validators/app/eventos.validator');
const feed = require('../../../../src/validators/app/feed.validator');
const { sesionToken } = require('../../../../src/validators/comunes');

test('un comentario vacío o de puros espacios no pasa', () => {
  assert.ok(!social.comentario.safeParse({ texto: '' }).success);
  assert.ok(!social.comentario.safeParse({ texto: '   \n  ' }).success);
});

test('el comentario se recorta y junta los saltos de línea en serie', () => {
  const r = social.comentario.parse({ texto: '  Muy   bueno\n\n\n\n\nvolveré  ' });
  assert.strictEqual(r.texto, 'Muy bueno\n\nvolveré');
});

test('un comentario no pasa de 500 caracteres', () => {
  assert.ok(!social.comentario.safeParse({ texto: 'a'.repeat(501) }).success);
  assert.ok(social.comentario.safeParse({ texto: 'a'.repeat(500) }).success);
});

test('reportar exige un motivo conocido', () => {
  assert.ok(!social.reporte.safeParse({ comentario_id: 3, motivo: 'no me gusta' }).success);
  assert.ok(social.reporte.safeParse({ comentario_id: 3, motivo: 'spam' }).success);
});

test('un lote de eventos va de 1 a 50', () => {
  assert.ok(!eventos.lote.safeParse({ eventos: [] }).success);
  const uno = { tipo: 'vista', plato_id: 4 };
  assert.ok(eventos.lote.safeParse({ eventos: Array(50).fill(uno) }).success);
  assert.ok(!eventos.lote.safeParse({ eventos: Array(51).fill(uno) }).success);
});

// El tipo desconocido lo descarta el service; el lote no se pierde entero.
test('un tipo de evento nuevo no tumba el lote en la validación', () => {
  assert.ok(eventos.lote.safeParse({ eventos: [{ tipo: 'algo_nuevo' }, { tipo: 'vista', plato_id: 1 }] }).success);
});

test('el feed admite uno o varios antojos y acota el límite', () => {
  assert.strictEqual(feed.pagina.parse({}).limite, 12);
  assert.deepStrictEqual(feed.pagina.parse({ antojo: ['chef', 'sabor:picante'] }).antojo, ['chef', 'sabor:picante']);
  assert.ok(!feed.pagina.safeParse({ limite: 500 }).success);
});

// Un token 'c:<id>' es el dueño de los "me gusta" de una CUENTA de la app: el
// menú web no puede usarlo para tocarlos.
test('el sesion_token del menú web no puede tener dos puntos', () => {
  assert.ok(!sesionToken.safeParse('c:15').success);
  assert.ok(sesionToken.safeParse('3f0a9d2c-6b1e-4c39-9a0e-2f9d8b7c6a51').success);
});
