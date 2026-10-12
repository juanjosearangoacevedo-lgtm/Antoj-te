const combosModel = require('../models/combos.model');
const { NotFoundError } = require('../errors');

const listar = (restauranteId) => combosModel.listar(restauranteId);

// Un combo de otro tenant se comporta como inexistente: el que sondea ids ajenos
// recibe 404 y no distingue "no existe" de "no es tuyo".
const obtener = async (id, restauranteId = null) => {
  const combo = await combosModel.buscarPorId(id, restauranteId);
  if (!combo) throw new NotFoundError('Combo no encontrado');
  return { ...combo, items: await combosModel.itemsDeCombo(id) };
};

const crear = async ({ restaurante_id, nombre, descripcion, precio, video_url, items }) => {
  const id = await combosModel.crear({ restaurante_id, nombre, descripcion, precio, video_url });
  if (Array.isArray(items) && items.length) await combosModel.reemplazarItems(id, items);
  return combosModel.buscarPorId(id);
};

const actualizar = async (id, datos, restauranteId = null) => {
  const actualizados = await combosModel.actualizar(id, datos, restauranteId);
  if (actualizados === 0) throw new NotFoundError('Combo no encontrado');
  return combosModel.buscarPorId(id, restauranteId);
};

// `reemplazarItems` no sabe de tenants, así que la pertenencia se comprueba aquí
// antes de tocar la composición.
const setItems = async (comboId, items, restauranteId = null) => {
  const combo = await combosModel.buscarPorId(comboId, restauranteId);
  if (!combo) throw new NotFoundError('Combo no encontrado');
  return combosModel.reemplazarItems(comboId, items);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminados = await combosModel.eliminar(id, restauranteId);
  if (eliminados === 0) throw new NotFoundError('Combo no encontrado');
};

module.exports = { listar, obtener, crear, actualizar, setItems, eliminar };
