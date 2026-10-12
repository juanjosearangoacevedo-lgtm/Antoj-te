const { v4: uuidv4 } = require('uuid');
const mesasModel = require('../models/mesas.model');
const sucursalesModel = require('../models/sucursales.model');
const { NotFoundError, ConflictError } = require('../errors');

const listarPorSucursal = (sucursalId, restauranteId = null) =>
  mesasModel.listarPorSucursal(sucursalId, restauranteId);

const crear = async ({ sucursal_id, numero_mesa }, restauranteId = null) => {
  // La sucursal es la que ata la mesa a un tenant, así que aceptarla del cliente sin
  // comprobarla dejaría sembrar mesas (y por tanto QR válidos) en otro restaurante.
  if (restauranteId != null) {
    const sucursal = await sucursalesModel.buscarPorId(sucursal_id, restauranteId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');
  }

  // El token del QR se genera aquí, no en la base: es una decisión de negocio
  // (identificador opaco e irrepetible por mesa).
  try {
    const id = await mesasModel.crear({ sucursal_id, numero_mesa, codigo_qr_token: uuidv4() });
    return mesasModel.buscarPorId(id, restauranteId);
  } catch (err) {
    if (mesasModel.esNumeroDuplicado(err)) {
      throw new ConflictError('Ya existe una mesa con ese numero en la sucursal');
    }
    throw err;
  }
};

const actualizar = async (id, datos, restauranteId = null) => {
  const actualizadas = await mesasModel.actualizar(id, datos, restauranteId);
  if (actualizadas === 0) throw new NotFoundError('Mesa no encontrada');
  return mesasModel.buscarPorId(id, restauranteId);
};

// Invalida el QR impreso: el token viejo deja de resolver a esta mesa.
const regenerarQr = async (id, restauranteId = null) => {
  const actualizadas = await mesasModel.actualizarTokenQr(id, uuidv4(), restauranteId);
  if (actualizadas === 0) throw new NotFoundError('Mesa no encontrada');
  return mesasModel.buscarPorId(id, restauranteId);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminadas = await mesasModel.eliminar(id, restauranteId);
  if (eliminadas === 0) throw new NotFoundError('Mesa no encontrada');
};

// Publico: al escanear el QR, resuelve mesa + sucursal + restaurante para abrir el menu
const resolverPorToken = async (token) => {
  const mesa = await mesasModel.resolverPorTokenQr(token);
  if (!mesa) throw new NotFoundError('Codigo QR invalido');
  return mesa;
};

module.exports = { listarPorSucursal, crear, actualizar, regenerarQr, eliminar, resolverPorToken };
