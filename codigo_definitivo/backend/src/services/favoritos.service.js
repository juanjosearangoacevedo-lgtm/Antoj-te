const favoritosModel = require('../models/favoritos.model');

// Un solo endpoint para marcar y desmarcar: se intenta BORRAR primero y, si no
// había nada que borrar, se crea.
//
// Antes esto era un SELECT y después un INSERT o un DELETE, y entre las dos
// consultas cabía otra petición: dos toques rápidos —o el doble toque de un
// dedo impaciente— dejaban dos filas para el mismo plato y la misma sesión, y a
// partir de ahí el toggle alternaba entre borrar una y crear otra sin volver
// nunca al estado limpio. Con el índice único que añade
// 2026-09-15_saneo_esquema.sql la base ya no lo permitiría, pero el service
// respondería un 500 en lugar de una respuesta útil.
//
// Con estas dos consultas atómicas, dos peticiones simultáneas pueden cruzarse
// de dos maneras y ninguna deja basura: si las dos borran en vano, las dos
// insertan y el INSERT IGNORE de la segunda no hace nada (ambas responden
// `true`); si la segunda borra lo que acaba de crear la primera, responden
// `true` y `false`. En los dos casos la tabla queda con 0 o 1 fila —nunca con
// dos— y la respuesta coincide con lo que la petición dejó en la base.
// Comprobado lanzando los dos toggles con Promise.all sobre el mismo plato.
const toggle = async ({ sesion_token, plato_id, combo_id }) => {
  const eliminados = await favoritosModel.eliminarPorClave({ sesion_token, plato_id, combo_id });
  if (eliminados > 0) return { favorito: false };

  await favoritosModel.crear({ sesion_token, plato_id, combo_id });
  return { favorito: true };
};

// Un token con ':' es el de una cuenta de la app ('c:<id>'): sus "me gusta" no
// se publican por esta ruta abierta (ver validators/comunes.js).
const listarPorSesion = async (sesionToken) =>
  String(sesionToken).includes(':') ? [] : favoritosModel.listarPorSesion(sesionToken);

module.exports = { toggle, listarPorSesion };
