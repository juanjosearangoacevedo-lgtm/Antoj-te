const crypto = require('crypto');

// Piezas puras de la integración con Wompi: firmar el checkout y verificar los
// eventos. Sin red ni base de datos, para poder probarlas con valores fijos.
// Referencia: https://docs.wompi.co/docs/colombia/widget-checkout-web/ y
// https://docs.wompi.co/docs/colombia/eventos/

const CHECKOUT_URL = 'https://checkout.wompi.co/p/';

const sha256 = (texto) => crypto.createHash('sha256').update(texto, 'utf8').digest('hex');

// Comparación en tiempo constante. `timingSafeEqual` revienta si los largos
// difieren, así que eso se descarta antes (y un largo distinto ya es un "no").
function igualesSeguro(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// La llave pública dice a qué Wompi hablar: pub_test_ es el sandbox y pub_prod_
// producción. Deducirlo de la llave evita una variable más que se pueda
// desalinear (llaves de producción apuntando al sandbox, o al revés).
const esSandbox = (llavePublica) => String(llavePublica).startsWith('pub_test_');

const apiBase = (llavePublica) =>
  esSandbox(llavePublica) ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';

// Firma de integridad del checkout: impide que alguien cambie el monto en la URL
// antes de pagar. Wompi la recalcula con el mismo secreto y rechaza si no cuadra.
const firmaIntegridad = ({ referencia, montoCentavos, moneda, secreto }) =>
  sha256(`${referencia}${montoCentavos}${moneda}${secreto}`);

function urlCheckout({ llavePublica, secretoIntegridad, referencia, montoCentavos, moneda, redirectUrl }) {
  const params = new URLSearchParams({
    'public-key': llavePublica,
    currency: moneda,
    'amount-in-cents': String(montoCentavos),
    reference: referencia,
    'signature:integrity': firmaIntegridad({ referencia, montoCentavos, moneda, secreto: secretoIntegridad }),
  });
  if (redirectUrl) params.set('redirect-url', redirectUrl);
  return `${CHECKOUT_URL}?${params.toString()}`;
}

// Lee una ruta tipo "transaction.amount_in_cents" dentro de `data`.
const leerRuta = (obj, ruta) => ruta.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

// Un evento es auténtico si su checksum es el SHA256 de: los valores de las
// propiedades que el propio evento enumera (en ese orden) + su timestamp + el
// secreto de eventos. Sin el secreto nadie puede fabricar uno que pase.
function eventoValido(evento, secretoEventos) {
  const firma = evento?.signature;
  if (!secretoEventos || !firma || !Array.isArray(firma.properties) || !firma.checksum) return false;
  if (evento.timestamp === undefined || evento.timestamp === null) return false;

  const valores = firma.properties.map((p) => {
    const v = leerRuta(evento.data, p);
    return v === undefined || v === null ? '' : String(v);
  });
  const esperado = sha256(`${valores.join('')}${evento.timestamp}${secretoEventos}`);
  return igualesSeguro(esperado, String(firma.checksum).toLowerCase());
}

// Estados de Wompi → estados de `pagos`.
const ESTADOS = {
  APPROVED: 'aprobado',
  DECLINED: 'rechazado',
  VOIDED: 'anulado',
  ERROR: 'error',
  PENDING: 'pendiente',
};
const estadoLocal = (estadoWompi) => ESTADOS[estadoWompi] || 'pendiente';

module.exports = { esSandbox, apiBase, firmaIntegridad, urlCheckout, eventoValido, estadoLocal };
