const crypto = require('crypto');
const pool = require('../config/db');
const pagosModel = require('../models/pagos.model');
const restaurantesModel = require('../models/restaurantes.model');
const planesModel = require('../models/planes.model');
const { estadoSuscripcion } = require('./auth.service');
const wompi = require('../utils/wompi');
const suscripciones = require('./suscripciones.service');
const { ApiError, BadRequestError, NotFoundError, UnauthorizedError } = require('../errors');

// Cobro de la suscripción con el Web Checkout de Wompi.
//
// El flujo: el admin pulsa "Pagar" → aquí se crea un pago 'pendiente' y se le
// devuelve la URL firmada del checkout → paga en Wompi (Nequi, PSE, tarjeta…) →
// Wompi avisa por webhook y además devuelve el navegador al panel. Cualquiera de
// los dos caminos cierra el pago; el que llegue segundo no hace nada.
//
// La fecha de fin NUNCA se mueve por lo que diga el navegador: o lo dice un
// evento firmado por Wompi, o lo dice la API de Wompi consultada desde aquí.

const MONEDA = 'COP';

// Se leen en cada uso y no al cargar el módulo: así el backend arranca aunque
// falten (los pagos quedan "no disponibles" y el resto del panel sigue igual).
const config = () => ({
  llavePublica: process.env.WOMPI_PUBLIC_KEY || '',
  secretoIntegridad: process.env.WOMPI_INTEGRITY_SECRET || '',
  secretoEventos: process.env.WOMPI_EVENTS_SECRET || '',
});

const disponible = () => {
  const c = config();
  return Boolean(c.llavePublica && c.secretoIntegridad && c.secretoEventos);
};

// A dónde vuelve el navegador tras pagar. En desarrollo el panel vive en Vite.
const urlPanel = () =>
  (
    process.env.SITIO_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://bitemo.co' : 'http://localhost:5173')
  ).replace(/\/$/, '');

// A dónde manda Wompi al navegador después de pagar. Sin parámetros propios:
// Wompi le añade ?id=<transacción>, y con un ?ref ya puesto la URL podría acabar
// con dos '?'. La referencia la sabe Wompi.
//
// El cortafuegos del checkout de Wompi responde 403 si la URL de regreso apunta a
// localhost o 127.0.0.1 (comprobado el 2026-09-28). En ese caso no se manda: el
// pago se puede hacer igual, solo que Wompi no devuelve al panel. Para probar el
// regreso en local, abrir el panel en http://bitemo.localhost:5173 y poner esa
// dirección en SITIO_URL y en CORS_ORIGENES; `*.localhost` sí la acepta.
const urlRegreso = () => {
  const url = `${urlPanel()}/admin/suscripcion`;
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    console.warn(
      '[pagos] Wompi bloquea URLs de regreso a localhost: el checkout no devolverá al panel. ' +
        'Para probarlo, usa SITIO_URL=http://bitemo.localhost:5173.'
    );
    return null;
  }
  return url;
};

// Única, no adivinable y con el restaurante a la vista para quien mire el
// panel de Wompi. Wompi admite hasta 255 caracteres; esta ronda los 30.
const nuevaReferencia = (restauranteId) =>
  `BTM-${restauranteId}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

const precioDe = (plan, periodo) => {
  const valor = periodo === 'anual' ? plan.precio_anual : plan.precio;
  return valor === null || valor === undefined ? 0 : Number(valor);
};

// Lo que pinta la pantalla de suscripción: plan, vencimiento, precios e historial.
const resumen = async (restauranteId) => {
  const restaurante = await restaurantesModel.buscarPorId(restauranteId);
  if (!restaurante) throw new NotFoundError('Restaurante no encontrado');
  const plan = restaurante.plan_id ? await planesModel.buscarPorId(restaurante.plan_id) : null;

  return {
    disponible: disponible(),
    sandbox: disponible() && wompi.esSandbox(config().llavePublica),
    plan: plan && {
      id: plan.id,
      nombre: plan.nombre,
      precio: precioDe(plan, 'mensual'),
      precio_anual: precioDe(plan, 'anual') || null,
    },
    suscripcion: await estadoSuscripcion(restauranteId),
    pagos: (await pagosModel.listarPorRestaurante(restauranteId)).map((p) => ({
      ...p,
      monto: Number(p.monto_centavos) / 100,
    })),
  };
};

// Crea el pago pendiente y devuelve a dónde mandar al navegador.
const iniciar = async (restauranteId, periodo) => {
  if (!disponible()) {
    throw new ApiError(503, 'Los pagos en línea aún no están activos. Escríbele al equipo de Bitemo.');
  }

  const restaurante = await restaurantesModel.buscarPorId(restauranteId);
  if (!restaurante) throw new NotFoundError('Restaurante no encontrado');
  const plan = restaurante.plan_id ? await planesModel.buscarPorId(restaurante.plan_id) : null;
  if (!plan) throw new BadRequestError('Tu restaurante no tiene un plan asignado');

  const precio = precioDe(plan, periodo);
  if (precio <= 0) {
    throw new BadRequestError(
      periodo === 'anual' ? 'Tu plan no tiene pago anual' : 'Tu plan no tiene un precio para pagar en línea'
    );
  }

  // Wompi trabaja en centavos. Math.round por si el DECIMAL trae ,00 flotante.
  const montoCentavos = Math.round(precio * 100);
  const referencia = nuevaReferencia(restauranteId);

  await pagosModel.crear({
    restauranteId,
    planId: plan.id,
    periodo,
    montoCentavos,
    moneda: MONEDA,
    referencia,
  });

  const c = config();
  return {
    referencia,
    url: wompi.urlCheckout({
      llavePublica: c.llavePublica,
      secretoIntegridad: c.secretoIntegridad,
      referencia,
      montoCentavos,
      moneda: MONEDA,
      redirectUrl: urlRegreso(),
    }),
  };
};

// Aplica a `pagos` (y, si se aprobó, a la suscripción) una transacción de Wompi
// que ya se sabe auténtica. Idempotente: repetirla no suma otro periodo.
const aplicarTransaccion = async (tx) => {
  if (!tx?.reference) return null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const pago = await pagosModel.buscarPorReferencia(tx.reference, conn, { bloquear: true });
    // Una referencia que no es nuestra (otro comercio de prueba, un evento viejo):
    // se ignora sin error, o Wompi reintentaría el webhook para siempre.
    if (!pago) {
      await conn.commit();
      return null;
    }

    // Ya sumó su periodo: nada que hacer, aunque llegue un estado distinto (un
    // intento rechazado anterior que Wompi notifica tarde, un PENDING rezagado).
    if (pago.aplicado_en) {
      await conn.commit();
      return pago;
    }

    // La firma de integridad ya impide pagar otro monto, pero si algo no cuadra
    // no se regala un periodo: se deja constancia y se revisa a mano.
    if (Number(tx.amount_in_cents) !== Number(pago.monto_centavos) || tx.currency !== pago.moneda) {
      console.warn(
        `[pagos] ${pago.referencia}: Wompi confirma ${tx.amount_in_cents} ${tx.currency}, ` +
          `se esperaba ${pago.monto_centavos} ${pago.moneda}. No se aplica.`
      );
      await pagosModel.actualizarResultado(pago.id, { estado: 'error', transaccionId: tx.id }, conn);
      await conn.commit();
      return { ...pago, estado: 'error' };
    }

    const estado = wompi.estadoLocal(tx.status);
    await pagosModel.actualizarResultado(
      pago.id,
      { estado, transaccionId: tx.id, metodo: tx.payment_method_type },
      conn
    );

    if (estado === 'aprobado') {
      const extendidas = await restaurantesModel.extenderSuscripcionActiva(
        pago.restaurante_id,
        pago.periodo,
        conn
      );
      if (extendidas === 0) {
        await restaurantesModel.crearSuscripcionPagada(pago.restaurante_id, pago.plan_id, pago.periodo, conn);
      }
      await pagosModel.marcarAplicado(pago.id, conn);
      // Si la carta estaba apagada por vencimiento, vuelve a verse.
      await suscripciones.trasCambio(pago.restaurante_id, conn);
    }

    await conn.commit();
    // El panel desbloqueado al instante, no a los 60 s de la caché.
    if (estado === 'aprobado') suscripciones.olvidar(pago.restaurante_id);
    return { ...pago, estado };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Webhook. Solo se cree lo que venga firmado con el secreto de eventos.
const procesarEvento = async (evento) => {
  if (!wompi.eventoValido(evento, config().secretoEventos)) {
    throw new UnauthorizedError('Firma del evento inválida');
  }
  if (evento.event !== 'transaction.updated') return;
  await aplicarTransaccion(evento.data?.transaction);
};

// La consulta a Wompi va con la llave pública: es lectura, y no hace falta la
// privada para ver una transacción por su id.
const obtenerTransaccion = async (transaccionId) => {
  const { llavePublica } = config();
  const res = await fetch(
    `${wompi.apiBase(llavePublica)}/transactions/${encodeURIComponent(transaccionId)}`,
    {
      headers: { Authorization: `Bearer ${llavePublica}` },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;
  const cuerpo = await res.json();
  return cuerpo?.data || null;
};

// Vuelta del checkout: Wompi devuelve el navegador con el id de la transacción.
// Ese id solo sirve para PREGUNTARLE a Wompi; lo que se aplica es lo que
// responde Wompi, y solo si la referencia es de un pago de este restaurante.
// Así el panel se actualiza al instante aunque el webhook tarde (o, en
// desarrollo, aunque no pueda llegar a localhost).
const consultar = async (restauranteId, transaccionId) => {
  const sinRespuesta = async () => ({
    estado: 'pendiente',
    suscripcion: await estadoSuscripcion(restauranteId),
  });
  if (!disponible()) return sinRespuesta();

  let tx;
  try {
    tx = await obtenerTransaccion(transaccionId);
  } catch (err) {
    // Si Wompi no responde, el pago sigue pendiente y el webhook lo cerrará.
    console.warn(`[pagos] no se pudo consultar ${transaccionId} en Wompi: ${err.message}`);
  }
  if (!tx?.reference) return sinRespuesta();

  let pago = await pagosModel.buscarDeRestaurante(tx.reference, restauranteId);
  if (!pago) throw new NotFoundError('Pago no encontrado');

  if (!pago.aplicado_en) {
    await aplicarTransaccion(tx);
    pago = await pagosModel.buscarDeRestaurante(tx.reference, restauranteId);
  }

  return {
    referencia: pago.referencia,
    estado: pago.estado,
    periodo: pago.periodo,
    monto: Number(pago.monto_centavos) / 100,
    aplicado: Boolean(pago.aplicado_en),
    suscripcion: await estadoSuscripcion(restauranteId),
  };
};

module.exports = { resumen, iniciar, procesarEvento, consultar, aplicarTransaccion };
