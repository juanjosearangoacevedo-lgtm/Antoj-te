const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { sign, firmarComensal } = require('../../../src/utils/jwt');
const { leerDispositivo, identificarComensal, exigirComensal } = require('../../../src/middlewares/comensal');

// Igual que en auth.test.js: aquí no hay base, así que la versión de sesión se
// sustituye por una fija. El middleware llama a `sesiones.vigente` a través del
// objeto del módulo, así que basta con reemplazar esa propiedad.
const sesiones = require('../../../src/services/sesionesComensal.service');
const VERSIONES = new Map([[41, 0]]); // comensalId -> sesion_version en la "base"
sesiones.vigente = async (payload) => {
  const id = Number(payload.sub);
  const version = VERSIONES.has(id) ? VERSIONES.get(id) : null;
  return version !== null && Number(payload.sv ?? 0) === version;
};

const token = (datos = {}) => `Bearer ${firmarComensal({ sub: '41', sv: 0, sid: 3, ...datos })}`;

function espia() {
  const llamadas = [];
  const next = (err) => llamadas.push(err);
  next.errores = () => llamadas.filter(Boolean);
  next.paso = () => llamadas.length === 1 && llamadas[0] === undefined;
  return next;
}

test('leerDispositivo acepta un UUID y la plataforma conocida', () => {
  const req = { headers: { 'x-dispositivo': '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', 'x-plataforma': 'android' } };
  const next = espia();
  leerDispositivo(req, {}, next);
  assert.ok(next.paso());
  assert.strictEqual(req.dispositivoId, '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b');
  assert.strictEqual(req.plataforma, 'android');
});

// El dispositivo no es una credencial: algo raro se ignora, no tumba la petición.
test('leerDispositivo ignora valores sin forma de UUID en vez de rechazar', () => {
  for (const valor of ['corto', '<script>alert(1)</script>-xxxxxxxxxx', 'a'.repeat(80)]) {
    const req = { headers: { 'x-dispositivo': valor, 'x-plataforma': 'blackberry' } };
    const next = espia();
    leerDispositivo(req, {}, next);
    assert.ok(next.paso());
    assert.strictEqual(req.dispositivoId, null, `deberia ignorar ${valor}`);
    assert.strictEqual(req.plataforma, null);
  }
});

test('identificarComensal deja pasar al visitante anonimo sin token', async () => {
  const req = { headers: {} };
  const next = espia();
  await identificarComensal(req, {}, next);
  assert.ok(next.paso());
  assert.strictEqual(req.comensal, null);
});

test('identificarComensal reconoce un token de comensal valido', async () => {
  const req = { headers: { authorization: token() } };
  const next = espia();
  await identificarComensal(req, {}, next);
  assert.ok(next.paso());
  assert.deepStrictEqual(req.comensal, { id: 41, sesionId: 3 });
});

// Quien manda un token espera que se use: ignorarlo escondería una sesión caducada.
test('identificarComensal responde 401 si el token que viene no vale', async () => {
  for (const authorization of ['Bearer no-es-un-jwt', 'Token abc', `Bearer ${sign({ id: 41, sv: 0 })}`]) {
    const next = espia();
    await identificarComensal({ headers: { authorization } }, {}, next);
    const [err] = next.errores();
    assert.strictEqual(err?.statusCode, 401, `deberia rechazar ${authorization.slice(0, 20)}`);
    assert.strictEqual(err?.details?.codigo, 'SESION_INVALIDA');
  }
});

test('exigirComensal pide cuenta cuando no hay token', async () => {
  const next = espia();
  await exigirComensal({ headers: {} }, {}, next);
  const [err] = next.errores();
  assert.strictEqual(err?.statusCode, 401);
  assert.strictEqual(err?.details?.codigo, 'CUENTA_REQUERIDA');
});

test('exigirComensal rechaza un token de staff aunque el id exista como comensal', async () => {
  const next = espia();
  await exigirComensal({ headers: { authorization: `Bearer ${sign({ id: 41, sub: '41', sv: 0 })}` } }, {}, next);
  assert.strictEqual(next.errores()[0]?.statusCode, 401);
});

test('exigirComensal rechaza el token emitido antes de cambiar la clave', async () => {
  VERSIONES.set(41, 1);
  try {
    const viejo = espia();
    await exigirComensal({ headers: { authorization: token({ sv: 0 }) } }, {}, viejo);
    assert.strictEqual(viejo.errores()[0]?.statusCode, 401);

    const nuevo = espia();
    await exigirComensal({ headers: { authorization: token({ sv: 1 }) } }, {}, nuevo);
    assert.ok(nuevo.paso(), 'el token con la version nueva debe pasar');
  } finally {
    VERSIONES.set(41, 0);
  }
});

test('exigirComensal rechaza el token de una cuenta borrada', async () => {
  const next = espia();
  await exigirComensal({ headers: { authorization: token({ sub: '99' }) } }, {}, next);
  assert.strictEqual(next.errores()[0]?.statusCode, 401);
});

// Si la base no responde, el fallo es del servidor (500), no del token.
test('si la base falla, el error pasa como error de servidor y no como 401', async () => {
  const original = sesiones.vigente;
  sesiones.vigente = async () => {
    throw new Error('la base no responde');
  };
  try {
    const next = espia();
    await exigirComensal({ headers: { authorization: token() } }, {}, next);
    const [err] = next.errores();
    assert.ok(err);
    assert.strictEqual(err.statusCode, undefined, 'no debe disfrazarse de 401');
  } finally {
    sesiones.vigente = original;
  }
});
