const recomendacionesModel = require('../models/recomendaciones.model');
const platosModel = require('../models/platos.model');
const { NotFoundError } = require('../errors');

// Publico: "si te gusto esto, te recomendamos..." (usado en el detalle del plato)
const porPlato = (platoId, limite) => recomendacionesModel.listarPorPlato(platoId, limite);

// Staff/motor IA: crea o actualiza el score de afinidad entre dos platos.
// Los DOS platos tienen que ser del mismo restaurante que pide el cambio, o se
// podría colar la carta de un vecino como recomendación dentro de la propia.
const crearOActualizar = async (datos, restauranteId = null) => {
  if (restauranteId != null) {
    for (const platoId of [datos.plato_id_origen, datos.producto_id_recomendado]) {
      const plato = await platosModel.buscarPorId(platoId, restauranteId);
      if (!plato) throw new NotFoundError('Plato no encontrado');
    }
  }
  return recomendacionesModel.upsert(datos);
};

const eliminar = async (id, restauranteId = null) => {
  const eliminadas = await recomendacionesModel.eliminar(id, restauranteId);
  if (eliminadas === 0) throw new NotFoundError('Recomendacion no encontrada');
};

module.exports = { porPlato, crearOActualizar, eliminar };
