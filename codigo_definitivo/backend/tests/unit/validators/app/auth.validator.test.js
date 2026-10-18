const test = require('node:test');
const assert = require('node:assert');

const v = require('../../../../src/validators/app/auth.validator');

const REGISTRO = {
  nombre: 'Ana Gómez',
  email: 'ana@correo.com',
  password: 'clave-segura-1',
  acepta_terminos: true,
};

test('un registro completo pasa', () => {
  const r = v.registro.safeParse(REGISTRO);
  assert.ok(r.success, r.error?.issues?.[0]?.message);
});

// Sin consentimiento no hay cuenta (Ley 1581): ni ausente, ni en false, ni "true".
test('el registro exige aceptar los terminos, y solo con true', () => {
  for (const acepta of [undefined, false, 'true', 1]) {
    const r = v.registro.safeParse({ ...REGISTRO, acepta_terminos: acepta });
    assert.ok(!r.success, `no deberia pasar con acepta_terminos=${acepta}`);
  }
});

test('el correo se guarda sin espacios y en minusculas', () => {
  const r = v.registro.safeParse({ ...REGISTRO, email: '  Ana@Correo.COM ' });
  assert.ok(r.success);
  assert.strictEqual(r.data.email, 'ana@correo.com');
});

test('la clave nueva tiene al menos 8 caracteres', () => {
  const r = v.registro.safeParse({ ...REGISTRO, password: 'corta' });
  assert.ok(!r.success);
  assert.match(r.error.issues[0].message, /8/);
});

test('el telefono es opcional; vacio cuenta como sin telefono', () => {
  assert.strictEqual(v.registro.parse(REGISTRO).telefono, undefined);
  assert.strictEqual(v.registro.parse({ ...REGISTRO, telefono: '' }).telefono, null);
  assert.strictEqual(v.registro.parse({ ...REGISTRO, telefono: '+57 300 123 4567' }).telefono, '+57 300 123 4567');
  assert.ok(!v.registro.safeParse({ ...REGISTRO, telefono: 'llámame' }).success);
});

// z.object() borra lo que no declara: un registro no puede fabricarse una cuenta
// ya verificada ni fijar su propia versión de sesión.
test('el registro descarta campos que el comensal no puede fijar', () => {
  const r = v.registro.parse({ ...REGISTRO, email_verificado_en: '2026-01-01', sesion_version: 99, role_id: 1 });
  assert.deepStrictEqual(Object.keys(r).sort(), ['acepta_terminos', 'email', 'nombre', 'password']);
});

test('el codigo de restablecer son exactamente 6 digitos', () => {
  const base = { email: 'ana@correo.com', password: 'clave-segura-1' };
  assert.ok(v.restablecer.safeParse({ ...base, codigo: '012345' }).success);
  for (const codigo of ['12345', '1234567', 'abcdef', '12 345']) {
    assert.ok(!v.restablecer.safeParse({ ...base, codigo }).success, `no deberia aceptar ${codigo}`);
  }
});

test('el refresh token solo admite caracteres de base64url', () => {
  assert.ok(v.sesion.safeParse({ refresh_token: 'A'.repeat(43) }).success);
  assert.ok(!v.sesion.safeParse({ refresh_token: 'corto' }).success);
  assert.ok(!v.sesion.safeParse({ refresh_token: `${'A'.repeat(40)}' OR 1=1` }).success);
});
