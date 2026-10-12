const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const carritoModel = require('../models/carrito.model');
const mesasModel = require('../models/mesas.model');
const pedidosModel = require('../models/pedidos.model');
const platosModel = require('../models/platos.model');
const combosModel = require('../models/combos.model');
const analiticaModel = require('../models/analitica.model');
const { BadRequestError, NotFoundError } = require('../errors');

async function resolverMesa(token) {
  const mesa = await mesasModel.buscarPorTokenQr(token);
  if (!mesa) throw new NotFoundError('Codigo QR invalido');
  return mesa;
}

// El feed ya oculta lo despublicado, pero ocultar no es impedir: esta ruta es
// pública y acepta cualquier id. Sin esta comprobación se podía pedir un plato
// retirado de la carta, o directamente uno de otro restaurante.
async function asegurarDisponible({ plato_id, combo_id }, restauranteId) {
  const disponible = plato_id
    ? await platosModel.disponibleEnRestaurante(plato_id, restauranteId)
    : await combosModel.disponibleEnRestaurante(combo_id, restauranteId);

  if (!disponible) throw new BadRequestError('El producto ya no esta disponible');
}

// El comensal no "abre" un carrito: se le crea solo al primer intento de usarlo.
async function getOrCreateCarrito(mesaId, sesionToken) {
  const existente = await carritoModel.buscarPorMesaYSesion(mesaId, sesionToken);
  if (existente) return existente;

  const id = await carritoModel.crear({ id: uuidv4(), mesa_id: mesaId, sesion_token: sesionToken });
  return carritoModel.buscarPorId(id);
}

// El precio de cada línea se calcula aquí, no en la base: precio base del plato o
// combo + sus modificadores, por la cantidad.
async function obtenerDetalleCompleto(carritoId) {
  const detalles = await carritoModel.detallesDeCarrito(carritoId);

  for (const d of detalles) {
    const mods = await carritoModel.modificadoresDeDetalle(d.id);
    d.modificadores = mods;

    const precioBase = d.plato_id ? Number(d.plato_precio) : Number(d.combo_precio);
    const precioMods = mods.reduce((acc, m) => acc + Number(m.precio_adicional), 0);
    d.precio_linea = Number(((precioBase + precioMods) * d.cantidad).toFixed(2));
  }

  const total = Number(detalles.reduce((acc, d) => acc + d.precio_linea, 0).toFixed(2));
  return { detalles, total };
}

const obtenerCarrito = async (token, sesionToken) => {
  const mesa = await resolverMesa(token);
  const carrito = await getOrCreateCarrito(mesa.id, sesionToken);
  const { detalles, total } = await obtenerDetalleCompleto(carrito.id);
  return { carrito, detalles, total };
};

const agregarItem = async (
  token,
  { sesion_token, plato_id, combo_id, cantidad, notas_instrucciones, modificadores }
) => {
  const mesa = await resolverMesa(token);
  await asegurarDisponible({ plato_id, combo_id }, mesa.restaurante_id);
  const carrito = await getOrCreateCarrito(mesa.id, sesion_token);

  const detalleId = await carritoModel.crearDetalle({
    carrito_id: carrito.id,
    plato_id,
    combo_id,
    cantidad,
    notas_instrucciones,
  });
  await carritoModel.agregarModificadores(detalleId, modificadores);

  // Evento de analitica: alimenta el embudo de conversion del panel
  await analiticaModel.registrarEvento({
    sucursal_id: mesa.sucursal_id,
    plato_id,
    combo_id,
    tipo_evento: 'agrego_carrito',
    sesion_token,
  });

  const { detalles, total } = await obtenerDetalleCompleto(carrito.id);
  return { carrito, detalles, total };
};

const actualizarItem = async (detalleId, { sesion_token, ...datos }) => {
  const actualizados = await carritoModel.actualizarDetalle(detalleId, datos, sesion_token);
  if (actualizados === 0) throw new NotFoundError('Linea de carrito no encontrada');
};

const eliminarItem = async (detalleId, sesionToken) => {
  const eliminados = await carritoModel.eliminarDetalle(detalleId, sesionToken);
  if (eliminados === 0) throw new NotFoundError('Linea de carrito no encontrada');
};

// Convierte el carrito en un pedido real, congelando precios y limpiando el carrito.
// Todo dentro de una transacción: un fallo a mitad no debe dejar un pedido a medias
// ni un carrito borrado sin pedido.
const checkout = async (token, { sesion_token, observaciones }) => {
  const mesa = await resolverMesa(token);
  const carrito = await getOrCreateCarrito(mesa.id, sesion_token);
  const { detalles, total } = await obtenerDetalleCompleto(carrito.id);
  if (detalles.length === 0) throw new BadRequestError('El carrito esta vacio');

  // Entre agregar y pagar pueden pasar horas, y en medio la cocina pudo retirar un
  // plato de la carta. Se revalida la lista entera antes de abrir la transacción.
  for (const d of detalles) {
    await asegurarDisponible(d, mesa.restaurante_id);
  }

  const conn = await pool.getConnection();
  let pedidoId;
  try {
    await conn.beginTransaction();

    pedidoId = await pedidosModel.crear(
      { mesa_id: mesa.id, sesion_token, estado: 'Recibido', total, observaciones },
      conn
    );

    for (const d of detalles) {
      // Se congela el precio del momento: si mañana sube, este pedido no cambia.
      const precioBase = d.plato_id ? d.plato_precio : d.combo_precio;
      const detalleId = await pedidosModel.crearDetalle(
        {
          pedido_id: pedidoId,
          plato_id: d.plato_id,
          combo_id: d.combo_id,
          cantidad: d.cantidad,
          precio_unitario: precioBase,
        },
        conn
      );

      for (const m of d.modificadores) {
        await pedidosModel.crearModificadorDeDetalle(
          { detalle_pedido_id: detalleId, opcion_modificador_id: m.id, precio_cobrado: m.precio_adicional },
          conn
        );
      }
    }

    // La compra se registra aquí, con el pedido, y no desde el navegador cuando el
    // checkout responde: una compra que ya cobraste no puede depender de que al
    // cliente le funcione una segunda petición.
    for (const d of detalles) {
      await analiticaModel.registrarEvento(
        {
          sucursal_id: mesa.sucursal_id,
          plato_id: d.plato_id,
          combo_id: d.combo_id,
          tipo_evento: 'compra_exitosa',
          sesion_token,
        },
        conn
      );
    }

    await pedidosModel.registrarCambioEstado(pedidoId, 'Recibido', conn);
    await carritoModel.eliminar(carrito.id, conn);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return pedidosModel.buscarPorId(pedidoId);
};

module.exports = { obtenerCarrito, agregarItem, actualizarItem, eliminarItem, checkout };
