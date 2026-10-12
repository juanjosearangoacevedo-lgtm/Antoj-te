const test = require('node:test');
const assert = require('node:assert');

const { crear } = require('../../../src/validators/llamados.validator');
const { MOTIVOS } = require('../../../src/services/llamados.service');

test('el llamado exige la sesion del comensal', () => {
  assert.strictEqual(crear.safeParse({ sesion_token: 'abc-123' }).success, true);
  assert.strictEqual(crear.safeParse({}).success, false);
  assert.strictEqual(crear.safeParse({ sesion_token: '' }).success, false);
});

test('el motivo es opcional y se limita a los que el service sabe interpretar', () => {
  assert.strictEqual(crear.safeParse({ sesion_token: 'abc' }).success, true, 'sin motivo vale');
  for (const motivo of MOTIVOS) {
    assert.strictEqual(
      crear.safeParse({ sesion_token: 'abc', motivo }).success,
      true,
      `${motivo} deberia aceptarse`
    );
  }
  assert.strictEqual(crear.safeParse({ sesion_token: 'abc', motivo: 'karaoke' }).success, false);
});
