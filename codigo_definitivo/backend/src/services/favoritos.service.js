const favoritosModel = require('../models/favoritos.model');

// Un solo endpoint para marcar y desmarcar: si ya existe se borra, si no se crea.
const toggle = async ({ sesion_token, plato_id, combo_id }) => {
  const existente = await favoritosModel.buscar({ sesion_token, plato_id, combo_id });

  if (existente) {
    await favoritosModel.eliminar(existente.id);
    return { favorito: false };
  }

  await favoritosModel.crear({ sesion_token, plato_id, combo_id });
  return { favorito: true };
};

const listarPorSesion = (sesionToken) => favoritosModel.listarPorSesion(sesionToken);

module.exports = { toggle, listarPorSesion };
