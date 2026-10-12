const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const wompi = require('../../../src/utils/wompi');

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
const SECRETO = 'test_events_secreto';

// Un evento como los que manda Wompi, firmado como lo firma Wompi.
function eventoFirmado(tx = {}, secreto = SECRETO) {
  const transaction = {
    id: '1234-1610641025-49201',
    status: 'APPROVED',
    amount_in_cents: 9900000,
    reference: 'BTM-1-abc',
    currency: 'COP',
    ...tx,
  };
  const timestamp = 1530291411;
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const checksum = sha256(
    `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secreto}`
  );
  return {
    event: 'transaction.updated',
    data: { transaction },
    signature: { properties, checksum },
    timestamp,
  };
}

test('un evento bien firmado es válido', () => {
  assert.strictEqual(wompi.eventoValido(eventoFirmado(), SECRETO), true);
});

test('el checksum en mayúsculas también vale', () => {
  const e = eventoFirmado();
  e.signature.checksum = e.signature.checksum.toUpperCase();
  assert.strictEqual(wompi.eventoValido(e, SECRETO), true);
});

test('cambiar el estado después de firmar invalida el evento', () => {
  const e = eventoFirmado({ status: 'DECLINED' });
  e.data.transaction.status = 'APPROVED';
  assert.strictEqual(wompi.eventoValido(e, SECRETO), false);
});

test('cambiar el monto después de firmar invalida el evento', () => {
  const e = eventoFirmado();
  e.data.transaction.amount_in_cents = 100;
  assert.strictEqual(wompi.eventoValido(e, SECRETO), false);
});

test('un evento firmado con otro secreto no pasa', () => {
  assert.strictEqual(wompi.eventoValido(eventoFirmado({}, 'otro_secreto'), SECRETO), false);
});

test('sin secreto configurado no se acepta nada', () => {
  assert.strictEqual(wompi.eventoValido(eventoFirmado(), ''), false);
});

test('un evento sin firma o sin timestamp no pasa', () => {
  const sinFirma = eventoFirmado();
  delete sinFirma.signature;
  assert.strictEqual(wompi.eventoValido(sinFirma, SECRETO), false);

  const sinTimestamp = eventoFirmado();
  delete sinTimestamp.timestamp;
  assert.strictEqual(wompi.eventoValido(sinTimestamp, SECRETO), false);

  assert.strictEqual(wompi.eventoValido(null, SECRETO), false);
});

test('la firma de integridad cubre referencia, monto y moneda', () => {
  const base = { referencia: 'BTM-1-abc', montoCentavos: 9900000, moneda: 'COP', secreto: 's' };
  assert.strictEqual(wompi.firmaIntegridad(base), sha256('BTM-1-abc9900000COPs'));
  assert.notStrictEqual(wompi.firmaIntegridad(base), wompi.firmaIntegridad({ ...base, montoCentavos: 100 }));
});

test('la URL del checkout lleva todo lo que Wompi exige', () => {
  const url = new URL(
    wompi.urlCheckout({
      llavePublica: 'pub_test_x',
      secretoIntegridad: 's',
      referencia: 'BTM-1-abc',
      montoCentavos: 9900000,
      moneda: 'COP',
      redirectUrl: 'https://bitemo.co/admin/suscripcion?ref=BTM-1-abc',
    })
  );
  assert.strictEqual(url.origin + url.pathname, 'https://checkout.wompi.co/p/');
  assert.strictEqual(url.searchParams.get('public-key'), 'pub_test_x');
  assert.strictEqual(url.searchParams.get('amount-in-cents'), '9900000');
  assert.strictEqual(url.searchParams.get('currency'), 'COP');
  assert.strictEqual(url.searchParams.get('reference'), 'BTM-1-abc');
  assert.strictEqual(url.searchParams.get('signature:integrity'), sha256('BTM-1-abc9900000COPs'));
  assert.strictEqual(
    url.searchParams.get('redirect-url'),
    'https://bitemo.co/admin/suscripcion?ref=BTM-1-abc'
  );
});

test('la llave pública decide si se habla con el sandbox o con producción', () => {
  assert.strictEqual(wompi.apiBase('pub_test_x'), 'https://sandbox.wompi.co/v1');
  assert.strictEqual(wompi.apiBase('pub_prod_x'), 'https://production.wompi.co/v1');
});

test('los estados de Wompi se traducen; uno desconocido queda pendiente', () => {
  assert.strictEqual(wompi.estadoLocal('APPROVED'), 'aprobado');
  assert.strictEqual(wompi.estadoLocal('DECLINED'), 'rechazado');
  assert.strictEqual(wompi.estadoLocal('VOIDED'), 'anulado');
  assert.strictEqual(wompi.estadoLocal('ERROR'), 'error');
  assert.strictEqual(wompi.estadoLocal('RARO'), 'pendiente');
});
