// Monedas soportadas para mostrar los precios del menú (ISO 4217).
export const MONEDAS = {
  COP: { etiqueta: 'Peso colombiano (COP)', locale: 'es-CO', decimales: 0, ejemplo: 32000 },
  MXN: { etiqueta: 'Peso mexicano (MXN)', locale: 'es-MX', decimales: 2, ejemplo: 240 },
  USD: { etiqueta: 'Dólar (USD)', locale: 'en-US', decimales: 2, ejemplo: 12.9 },
  EUR: { etiqueta: 'Euro (EUR)', locale: 'es-ES', decimales: 2, ejemplo: 11.9 },
  ARS: { etiqueta: 'Peso argentino (ARS)', locale: 'es-AR', decimales: 0, ejemplo: 8500 },
  CLP: { etiqueta: 'Peso chileno (CLP)', locale: 'es-CL', decimales: 0, ejemplo: 9990 },
  PEN: { etiqueta: 'Sol peruano (PEN)', locale: 'es-PE', decimales: 2, ejemplo: 39.9 },
};

// Moneda activa del restaurante en la sesión del comensal.
// La fija SessionContext al cargar la config; por defecto COP.
let monedaActual = 'COP';

export function setMoneda(codigo) {
  if (codigo && MONEDAS[codigo]) monedaActual = codigo;
}

/** La moneda activa del menú abierto (la que fijó SessionContext). */
export function monedaActiva() {
  return monedaActual;
}

// Moneda en la que Antojate factura sus propias suscripciones. Es independiente
// de `monedaActual`: esa es la del menú de cada restaurante y la elige él.
export const MONEDA_PLANES = 'COP';

// Formatea un valor como moneda. Si no se pasa `codigo`, usa la moneda activa.
export function formatoMoneda(valor, codigo) {
  const code = codigo && MONEDAS[codigo] ? codigo : MONEDAS[monedaActual] ? monedaActual : 'COP';
  const cfg = MONEDAS[code];
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: cfg.decimales,
    maximumFractionDigits: cfg.decimales,
  }).format(Number(valor) || 0);
}

// Precio de un plan de Antojate (panel de superadmin). Siempre en pesos, sin
// decimales: "$ 169.900". No usa la moneda activa a propósito —el menú que esté
// abierto no debe cambiar cómo se ve lo que cobramos nosotros.
export function formatoPrecioPlan(valor) {
  return formatoMoneda(valor, MONEDA_PLANES);
}
