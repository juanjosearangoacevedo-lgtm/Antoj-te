// Configuración que la app consulta al arrancar: /api/app/v1/config.
//
// Existe desde la primera versión por una razón que no se puede arreglar después:
// una app publicada no se actualiza a la fuerza. Si algún día un cambio del
// backend rompe una versión vieja, la única salida es que esa versión sepa
// preguntar "¿me tengo que actualizar?". Ese mecanismo tiene que venir ya en la
// primera que se instale; añadirlo más tarde no alcanza a las que ya están en los
// teléfonos.
//
// Subir `VERSION_MINIMA` obliga a actualizar a quien tenga una versión anterior
// (la app lo compara con la suya y bloquea con un aviso). Se cambia aquí y se
// despliega el backend; no hace falta publicar nada en las tiendas.
const VERSION_MINIMA = { ios: '0.1.0', android: '0.1.0' };

const obtener = (req, res) => {
  res.json({ version_minima: VERSION_MINIMA });
};

module.exports = { VERSION_MINIMA, obtener };
