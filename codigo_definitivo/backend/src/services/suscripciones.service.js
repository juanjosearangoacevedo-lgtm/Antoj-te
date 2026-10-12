const pool = require('../config/db');
const authModel = require('../models/auth.model');
const restaurantesModel = require('../models/restaurantes.model');
const { clearFeatureCache } = require('../middlewares/features');
const { NotFoundError, BadRequestError } = require('../errors');

// Ciclo de vida de la membresía de un restaurante.
//
//   alta ──(14 días de prueba)──▶ vence ──(7 días de gracia)──▶ carta apagada
//                                   │                              │
//                  panel bloqueado salvo Suscripción     estado 'vencido'
//
// - Una cuenta nueva nace con DIAS_PRUEBA de prueba y vence sola.
// - Al vencer, el panel (y la cocina) quedan bloqueados salvo la pantalla de
//   pago: lo hace el middleware `authenticate` con `estadoCacheado`.
// - La carta pública sigue DIAS_GRACIA días más, para no dejar a los comensales
//   sin menú de golpe por un olvido. Pasados, `aplicarVencimientos` pone el
//   restaurante en estado 'vencido' y todo lo público lo trata como no disponible.
// - Pagar, o que el superadmin renueve o sume días, lo reactiva.

const DIAS_PRUEBA = 14;
const DIAS_GRACIA = 7;
const DIAS_AVISO = 7;

// Estado completo de la membresía, tal como lo ven el panel y el aviso.
// null = el restaurante no tiene ninguna suscripción.
async function estado(restauranteId) {
  if (!restauranteId) return null;
  const s = await authModel.suscripcionVigente(restauranteId, DIAS_GRACIA);
  if (!s) return null;

  const sinFin = s.fecha_fin === null;
  const vencida = s.estado === 'vencida' || (!sinFin && Boolean(Number(s.pasada)));
  const dias = sinFin ? null : Number(s.dias_restantes);
  return {
    estado: vencida ? 'vencida' : s.estado,
    fecha_fin: s.fecha_fin,
    dias_restantes: dias,
    vencida,
    por_vencer: !vencida && dias !== null && dias <= DIAS_AVISO,
    // Hasta cuándo sigue visible la carta pública después de vencer.
    gracia_hasta: vencida ? s.gracia_hasta : null,
    carta_apagada: vencida && Boolean(Number(s.gracia_agotada)),
  };
}

// El middleware de autenticación pregunta esto en CADA petición del panel. Se
// recuerda 60 s por restaurante; `olvidar` lo descarta al pagar o al ajustarlo
// el superadmin, así que esos cambios se notan al instante.
const TTL_MS = 60 * 1000;
const cache = new Map(); // restauranteId -> { valor, vence }

async function estadoCacheado(restauranteId) {
  const clave = Number(restauranteId);
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > Date.now()) return guardado.valor;
  const valor = await estado(clave);
  cache.set(clave, { valor, vence: Date.now() + TTL_MS });
  return valor;
}

function olvidar(restauranteId) {
  cache.delete(Number(restauranteId));
  clearFeatureCache(restauranteId); // la caché de features guarda el estado del restaurante
}

// Tras cualquier cambio que pueda dejar la suscripción vigente: si el
// restaurante estaba apagado por vencimiento, vuelve a 'activo'.
async function trasCambio(restauranteId, db = pool) {
  await restaurantesModel.reactivarSiVencido(restauranteId, db);
}

// Ajustes manuales del superadmin. Acciones:
//   sumar_dias      { dias }      prueba más larga, cortesía, compensación
//   fijar_fecha     { fecha }     'YYYY-MM-DD'; pagos en efectivo o transferencia
//   renovar         { periodo }   'mensual' | 'anual', como si hubiera pagado
//   vencer                        corta ya: panel bloqueado, carta con gracia
//   sin_vencimiento               cuentas de demostración o cortesía indefinida
async function ajustar(restauranteId, { accion, dias, fecha, periodo }) {
  const restaurante = await restaurantesModel.buscarPorId(restauranteId);
  if (!restaurante) throw new NotFoundError('Restaurante no encontrado');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Un restaurante sin suscripción activa (datos viejos, o se canceló) recibe
    // una nueva con su plan, para que el ajuste tenga sobre qué aplicarse.
    if ((await restaurantesModel.finSuscripcionActiva(restauranteId, conn)) === undefined) {
      if (!restaurante.plan_id) throw new BadRequestError('El restaurante no tiene plan asignado');
      await restaurantesModel.crearSuscripcion(restauranteId, restaurante.plan_id, conn);
    }

    if (accion === 'sumar_dias') {
      await restaurantesModel.sumarDiasSuscripcion(restauranteId, dias, conn);
    } else if (accion === 'fijar_fecha') {
      await restaurantesModel.fijarFinSuscripcion(restauranteId, fecha, conn);
    } else if (accion === 'renovar') {
      await restaurantesModel.extenderSuscripcionActiva(restauranteId, periodo, conn);
    } else if (accion === 'vencer') {
      await restaurantesModel.vencerSuscripcionAhora(restauranteId, conn);
    } else if (accion === 'sin_vencimiento') {
      await restaurantesModel.fijarFinSuscripcion(restauranteId, null, conn);
    } else {
      throw new BadRequestError('Acción de suscripción no reconocida');
    }

    // 'vencer' no reactiva nada; el resto puede dejarla vigente.
    if (accion !== 'vencer') await trasCambio(restauranteId, conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  olvidar(restauranteId);
  // Si el ajuste dejó la fecha en el pasado ("vencer", o una fecha vieja), la
  // gracia puede estar ya agotada: se aplica ahora, no en la próxima pasada.
  await aplicarVencimientos();
  return estado(restauranteId);
}

// Apaga (estado 'vencido') los restaurantes cuya gracia terminó. La corre el
// servidor cada hora y tras cada ajuste manual. Devuelve cuántos apagó.
async function aplicarVencimientos() {
  const ids = await restaurantesModel.idsConGraciaAgotada(DIAS_GRACIA);
  if (!ids.length) return 0;
  const apagados = await restaurantesModel.marcarVencidos(ids);
  ids.forEach(olvidar);
  console.log(`[suscripciones] ${apagados} restaurante(s) pasan a 'vencido': ${ids.join(', ')}`);
  return apagados;
}

let temporizador = null;
function programarVencimientos() {
  const correr = () =>
    aplicarVencimientos().catch((err) =>
      console.error(`[suscripciones] no se pudieron aplicar vencimientos: ${err.message}`)
    );
  setTimeout(correr, 10 * 1000); // al arrancar, cuando la base ya responde
  temporizador = setInterval(correr, 60 * 60 * 1000);
  temporizador.unref(); // no impide que el proceso se cierre en SIGTERM
}

module.exports = {
  DIAS_PRUEBA,
  DIAS_GRACIA,
  estado,
  estadoCacheado,
  olvidar,
  trasCambio,
  ajustar,
  aplicarVencimientos,
  programarVencimientos,
};
