const test = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');

const validar = require('../../../src/middlewares/validar');

const esquema = z.object({
  nombre: z.string().trim().min(1, 'nombre es obligatorio'),
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  nota: z.string().optional(),
});

function correr(schema, body, origen = 'body') {
  const req = { body, query: {}, params: {} };
  let capturado;
  validar(schema, origen)(req, {}, (err) => {
    capturado = err;
  });
  return { req, err: capturado };
}

test('deja pasar un body valido', () => {
  const { err } = correr(esquema, { nombre: 'Hamburguesa', cantidad: 2 });
  assert.strictEqual(err, undefined);
});

test('convierte los tipos: "3" llega al controller como numero 3', () => {
  const { req } = correr(esquema, { nombre: 'Hamburguesa', cantidad: '3' });
  assert.strictEqual(req.body.cantidad, 3);
  assert.strictEqual(typeof req.body.cantidad, 'number');
});

test('recorta los espacios de los textos', () => {
  const { req } = correr(esquema, { nombre: '  Hamburguesa  ', cantidad: 1 });
  assert.strictEqual(req.body.nombre, 'Hamburguesa');
});

test('rechaza con 400 y el mensaje del esquema', () => {
  const { err } = correr(esquema, { nombre: '', cantidad: 1 });
  assert.ok(err, 'deberia haber error');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.message, 'nombre es obligatorio');
});

test('acumula todos los problemas en details, no solo el primero', () => {
  const { err } = correr(esquema, { nombre: '', cantidad: 0 });
  assert.strictEqual(err.details.length, 2);
  const campos = err.details.map((d) => d.campo).sort();
  assert.deepStrictEqual(campos, ['cantidad', 'nombre']);
});

test('descarta los campos que el esquema no declara', () => {
  const { req } = correr(esquema, { nombre: 'Pizza', cantidad: 1, precio_secreto: 0 });
  assert.strictEqual(req.body.precio_secreto, undefined, 'un campo no declarado no debe llegar al service');
});

test('un body ausente se trata como objeto vacio, no revienta', () => {
  const req = { body: undefined, query: {}, params: {} };
  let err;
  validar(esquema)(req, {}, (e) => {
    err = e;
  });
  assert.strictEqual(err.statusCode, 400);
});

test('sobre query no reasigna el objeto (Express 5 lo tiene de solo lectura)', () => {
  const filtros = z.object({ pagina: z.coerce.number().int().default(1) });
  const req = { body: {}, query: { pagina: '4' }, params: {} };
  const original = req.query;

  validar(filtros, 'query')(req, {}, () => {});

  assert.strictEqual(req.query, original, 'debe mutarse en sitio, no reemplazarse');
  assert.strictEqual(req.query.pagina, 4);
});
