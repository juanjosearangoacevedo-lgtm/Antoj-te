const test = require('node:test');
const assert = require('node:assert');

const {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../../src/errors');

test('ApiError guarda statusCode, mensaje y detalles', () => {
  const err = new ApiError(418, 'Soy una tetera', { pista: 'RFC 2324' });
  assert.strictEqual(err.statusCode, 418);
  assert.strictEqual(err.message, 'Soy una tetera');
  assert.deepStrictEqual(err.details, { pista: 'RFC 2324' });
  assert.ok(err instanceof Error, 'debe seguir siendo un Error de verdad');
});

test('cada subclase lleva su codigo HTTP', () => {
  const casos = [
    [new BadRequestError(), 400],
    [new UnauthorizedError(), 401],
    [new ForbiddenError(), 403],
    [new NotFoundError(), 404],
    [new ConflictError(), 409],
  ];
  for (const [err, codigo] of casos) {
    assert.strictEqual(err.statusCode, codigo, `${err.name} deberia ser ${codigo}`);
    assert.ok(err instanceof ApiError, `${err.name} debe heredar de ApiError`);
    assert.ok(err.message.length > 0, `${err.name} necesita un mensaje por defecto`);
  }
});

test('el mensaje propio pisa al mensaje por defecto', () => {
  const err = new NotFoundError('Plato no encontrado');
  assert.strictEqual(err.message, 'Plato no encontrado');
  assert.strictEqual(err.statusCode, 404);
});

test('errorHandler traduce ApiError a la respuesta que espera el frontend', () => {
  const errorHandler = require('../../src/middlewares/errorHandler');

  const respuesta = (() => {
    let capturado = {};
    return {
      status(c) {
        capturado.codigo = c;
        return this;
      },
      json(cuerpo) {
        capturado.cuerpo = cuerpo;
        return capturado;
      },
      leer: () => capturado,
    };
  })();

  errorHandler(new ConflictError('Ya existe un usuario con ese email'), {}, respuesta, () => {});
  const { codigo, cuerpo } = respuesta.leer();

  assert.strictEqual(codigo, 409);
  assert.strictEqual(cuerpo.error, true);
  assert.strictEqual(cuerpo.message, 'Ya existe un usuario con ese email');
});

test('un error cualquiera se responde como 500 sin filtrar el detalle interno', () => {
  const errorHandler = require('../../src/middlewares/errorHandler');
  let capturado = {};
  const res = {
    status(c) {
      capturado.codigo = c;
      return this;
    },
    json(cuerpo) {
      capturado.cuerpo = cuerpo;
    },
  };

  errorHandler(new Error('ER_ACCESS_DENIED_ERROR'), {}, res, () => {});
  assert.strictEqual(capturado.codigo, 500);
  assert.strictEqual(capturado.cuerpo.error, true);
});
