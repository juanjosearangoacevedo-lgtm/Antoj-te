const pool = require('../config/db');
const restaurantesModel = require('../models/restaurantes.model');
const planesModel = require('../models/planes.model');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors');
const { clearFeatureCache } = require('../middlewares/features');
const suscripciones = require('./suscripciones.service');
const { limpiarCacheSeo } = require('../routes/seo.routes');

const ESTADOS_RESTAURANTE = ['pendiente', 'activo', 'suspendido'];

const listar = () => restaurantesModel.listar();

const obtener = async (id) => {
  const restaurante = await restaurantesModel.buscarPorIdConPlan(id);
  if (!restaurante) throw new NotFoundError('Restaurante no encontrado');
  return restaurante;
};

// Alta: el restaurante nace con su primera suscripción al plan elegido, en
// prueba gratis de DIAS_PRUEBA días. Antes nacía "sin vencimiento" y nadie tenía
// motivo para pagar nunca.
const crear = async ({ nombre, logo_url, plan_id, estado }) => {
  const id = await restaurantesModel.crear({ nombre, logo_url, plan_id, estado });
  await restaurantesModel.crearSuscripcion(id, plan_id, undefined, { diasPrueba: suscripciones.DIAS_PRUEBA });
  return restaurantesModel.buscarPorId(id);
};

// Superadmin: sumar días, fijar fecha, renovar, vencer o dejar sin vencimiento.
const ajustarSuscripcion = (id, datos) => suscripciones.ajustar(id, datos);

// Del nombre sale la dirección pública si la escriben con espacios o tildes.
const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
const aSlug = (texto) =>
  texto
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (l) => SIN_TILDE[l])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const actualizar = async (id, datos) => {
  const valores = { ...datos };
  if (valores.slug) valores.slug = aSlug(valores.slug);

  let actualizados;
  try {
    actualizados = await restaurantesModel.actualizar(id, valores);
  } catch (err) {
    // El slug es la URL pública: dos restaurantes con el mismo romperían el
    // enlace de uno de los dos. Lo impide un índice único; esto da el mensaje.
    if (err?.code === 'ER_DUP_ENTRY') {
      throw new ConflictError(`La dirección "${valores.slug}" ya está tomada por otro restaurante`);
    }
    throw err;
  }

  if (actualizados === 0) throw new NotFoundError('Restaurante no encontrado');
  clearFeatureCache(id); // pudo cambiar de plan
  limpiarCacheSeo(); // el nombre, la ciudad o la descripción salen en la vitrina
  return restaurantesModel.buscarPorId(id);
};

// Superadmin: aprobar / suspender / reactivar un restaurante
const cambiarEstado = async (id, estado) => {
  if (!ESTADOS_RESTAURANTE.includes(estado)) {
    throw new BadRequestError(`estado debe ser uno de: ${ESTADOS_RESTAURANTE.join(', ')}`);
  }

  const actualizados = await restaurantesModel.actualizarEstado(id, estado);
  if (actualizados === 0) throw new NotFoundError('Restaurante no encontrado');

  clearFeatureCache(id);
  return restaurantesModel.buscarPorId(id);
};

// Superadmin: cambiar el plan de suscripción. Cerrar la suscripción anterior y
// abrir la nueva van juntas en una transacción, para no dejar al restaurante ni
// con dos suscripciones activas ni con ninguna.
const cambiarPlan = async (id, planId) => {
  const plan = await planesModel.buscarPorId(planId);
  if (!plan) throw new NotFoundError('Plan no encontrado');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const actualizados = await restaurantesModel.actualizarPlan(id, planId, conn);
    if (actualizados === 0) throw new NotFoundError('Restaurante no encontrado');

    // La fecha de fin pasa tal cual al plan nuevo. Antes la suscripción nueva
    // nacía sin fecha: cambiar de plan regalaba acceso ilimitado.
    const finAnterior = await restaurantesModel.finSuscripcionActiva(id, conn);
    await restaurantesModel.cancelarSuscripcionesActivas(id, conn);
    await restaurantesModel.crearSuscripcion(id, planId, conn, { fechaFin: finAnterior ?? null });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  clearFeatureCache(id);
  return restaurantesModel.buscarPorIdConPlan(id);
};

const eliminar = async (id) => {
  const eliminados = await restaurantesModel.eliminar(id);
  if (eliminados === 0) throw new NotFoundError('Restaurante no encontrado');
  clearFeatureCache(id);
};

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, cambiarPlan, eliminar, ajustarSuscripcion };
