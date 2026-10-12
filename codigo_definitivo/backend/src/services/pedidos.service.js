const pool = require('../config/db');
const pedidosModel = require('../models/pedidos.model');
const { BadRequestError, NotFoundError } = require('../errors');

// Ciclo de vida de un pedido. El orden importa: es el flujo del tablero de cocina.
const ESTADOS = ['Recibido', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'];

// Staff (KDS): tablero de cocina con filtros por estado/sucursal
const listar = (restauranteId, filtros = {}) => pedidosModel.listar(restauranteId, filtros);

const obtener = async (id, restauranteId = null) => {
  const pedido = await pedidosModel.buscarPorId(id, restauranteId);
  if (!pedido) throw new NotFoundError('Pedido no encontrado');

  const detalles = await pedidosModel.detallesDePedido(id);
  for (const d of detalles) {
    d.modificadores = await pedidosModel.modificadoresDeDetalle(d.id);
  }

  const tiempos = await pedidosModel.tiemposDePedido(id);
  return { ...pedido, detalles, tiempos };
};

// Staff (KDS): mover el pedido al siguiente estado, dejando registro para medir tiempos de cocina.
// El cambio y su bitácora van en una transacción: o quedan los dos, o ninguno.
const cambiarEstado = async (id, estado, restauranteId = null) => {
  if (!ESTADOS.includes(estado)) {
    throw new BadRequestError(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Un pedido de otra cocina no actualiza ninguna fila, y eso aborta antes de
    // dejar rastro en la bitácora.
    const actualizados = await pedidosModel.actualizarEstado(id, estado, restauranteId, conn);
    if (actualizados === 0) throw new NotFoundError('Pedido no encontrado');

    await pedidosModel.registrarCambioEstado(id, estado, conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return pedidosModel.buscarPorId(id, restauranteId);
};

// Publico: el comensal sigue el estado de sus pedidos con su sesion anonima
const misPedidos = (sesionToken) => pedidosModel.listarPorSesion(sesionToken);

module.exports = { ESTADOS, listar, obtener, cambiarEstado, misPedidos };
