const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const { sign } = require('../../../src/utils/jwt');
const { authenticate, authorize, resolveRestauranteId } = require('../../../src/middlewares/auth');

// authenticate consulta la versión de sesión del usuario en la base. Aquí no hay
// base: se sustituye por una versión fija por usuario. El middleware llama a
// `sesiones.vigente` a través del objeto del módulo, así que basta con
// reemplazar esa propiedad.
const sesiones = require('../../../src/services/sesiones.service');
const VERSIONES = new Map([[1, 0], [2, 0]]); // id -> sesion_version en la "base"
sesiones.vigente = async (payload) => {
  const version = VERSIONES.has(payload.id) ? VERSIONES.get(payload.id) : null;
  return version !== null && (payload.sv ?? 0) === version;
};

// Igual con la membresía del restaurante: restauranteId -> { vencida }.
const suscripciones = require('../../../src/services/suscripciones.service');
const MEMBRESIAS = new Map([[3, { vencida: false }]]);
suscripciones.estadoCacheado = async (restauranteId) => MEMBRESIAS.get(restauranteId) ?? null;

const SUPERADMIN = { id: 1, nombre: 'Root', role_nombre: 'superadmin', restaurante_id: null };
const ADMIN = { id: 2, nombre: 'Ana', role_nombre: 'admin_restaurante', restaurante_id: 3 };

// `next` de mentira: guarda el error con el que se le llamó (o ninguno).
function espia() {
  const llamadas = [];
  const next = (err) => llamadas.push(err);
  next.errores = () => llamadas.filter(Boolean);
  next.paso = () => llamadas.length === 1 && llamadas[0] === undefined;
  return next;
}

test('authenticate acepta un Bearer valido y deja el usuario en req.user', async () => {
  const req = { headers: { authorization: `Bearer ${sign(ADMIN)}` } };
  const next = espia();

  await authenticate(req, {}, next);

  assert.ok(next.paso(), 'deberia continuar sin error');
  assert.strictEqual(req.user.role_nombre, 'admin_restaurante');
  assert.strictEqual(req.user.restaurante_id, 3);
});

test('authenticate responde 401 sin cabecera, con formato raro o token invalido', async () => {
  const casos = [
    { headers: {} },
    { headers: { authorization: 'Token abc' } },
    { headers: { authorization: 'Bearer no-es-un-jwt' } },
  ];

  for (const req of casos) {
    const next = espia();
    await authenticate(req, {}, next);
    const [err] = next.errores();
    assert.ok(err, `deberia fallar con ${JSON.stringify(req.headers)}`);
    assert.strictEqual(err.statusCode, 401);
  }
});

test('authenticate rechaza un token con una version de sesion vieja', async () => {
  // La clave de Ana se cambió después de emitir su token: la versión subió a 1.
  VERSIONES.set(2, 1);
  try {
    const viejo = espia();
    await authenticate({ headers: { authorization: `Bearer ${sign({ ...ADMIN, sv: 0 })}` } }, {}, viejo);
    assert.strictEqual(viejo.errores()[0]?.statusCode, 401);

    const nuevo = espia();
    await authenticate({ headers: { authorization: `Bearer ${sign({ ...ADMIN, sv: 1 })}` } }, {}, nuevo);
    assert.ok(nuevo.paso(), 'el token con la version nueva debe pasar');
  } finally {
    VERSIONES.set(2, 0);
  }
});

test('authenticate rechaza el token de un usuario borrado', async () => {
  const next = espia();
  await authenticate({ headers: { authorization: `Bearer ${sign({ ...ADMIN, id: 99 })}` } }, {}, next);
  assert.strictEqual(next.errores()[0]?.statusCode, 401);
});

test('un token sin sv (emitido antes de la revocacion) cuenta como version 0', async () => {
  const next = espia();
  await authenticate({ headers: { authorization: `Bearer ${sign(ADMIN)}` } }, {}, next);
  assert.ok(next.paso());
});

test('con la membresia vencida el panel responde 402, salvo sesion y pagos', async () => {
  MEMBRESIAS.set(3, { vencida: true });
  try {
    const token = `Bearer ${sign(ADMIN)}`;

    const panel = espia();
    await authenticate({ headers: { authorization: token }, originalUrl: '/api/platos' }, {}, panel);
    const [err] = panel.errores();
    assert.strictEqual(err?.statusCode, 402);
    assert.strictEqual(err?.details?.codigo, 'SUSCRIPCION_VENCIDA');

    for (const ruta of ['/api/auth/me', '/api/pagos', '/api/pagos/transaccion/1-2']) {
      const next = espia();
      await authenticate({ headers: { authorization: token }, originalUrl: ruta }, {}, next);
      assert.ok(next.paso(), `${ruta} debe seguir abierta para poder pagar`);
    }
  } finally {
    MEMBRESIAS.set(3, { vencida: false });
  }
});

test('el superadmin no tiene membresia que vencer', async () => {
  const next = espia();
  await authenticate(
    { headers: { authorization: `Bearer ${sign(SUPERADMIN)}` }, originalUrl: '/api/restaurantes' },
    {},
    next
  );
  assert.ok(next.paso());
});

test('authorize deja pasar al rol permitido y bloquea al resto con 403', () => {
  const permitido = espia();
  authorize('superadmin', 'admin_restaurante')({ user: ADMIN }, {}, permitido);
  assert.ok(permitido.paso());

  const bloqueado = espia();
  authorize('superadmin')({ user: ADMIN }, {}, bloqueado);
  assert.strictEqual(bloqueado.errores()[0].statusCode, 403);
});

test('authorize responde 401 si no hubo authenticate antes', () => {
  const next = espia();
  authorize('superadmin')({}, {}, next);
  assert.strictEqual(next.errores()[0].statusCode, 401);
});

// Este es el corazón del aislamiento multi-tenant: un admin NO puede pedir
// datos de otro restaurante mandando restaurante_id por query o body.
test('resolveRestauranteId ignora lo que pida un admin y usa el de su token', () => {
  const req = { user: ADMIN, query: { restaurante_id: '999' }, body: { restaurante_id: 999 }, params: {} };
  assert.strictEqual(resolveRestauranteId(req), 3);
});

test('resolveRestauranteId deja al superadmin elegir restaurante', () => {
  const porQuery = { user: SUPERADMIN, query: { restaurante_id: '12' }, body: {}, params: {} };
  assert.strictEqual(resolveRestauranteId(porQuery), '12');

  const porBody = { user: SUPERADMIN, query: {}, body: { restaurante_id: 8 }, params: {} };
  assert.strictEqual(resolveRestauranteId(porBody), 8);

  const sinIndicar = { user: SUPERADMIN, query: {}, body: {}, params: {} };
  assert.strictEqual(resolveRestauranteId(sinIndicar), null, 'sin indicar = toda la plataforma');
});
