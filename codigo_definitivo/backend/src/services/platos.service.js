const platosModel = require('../models/platos.model');
const categoriasModel = require('../models/categorias.model');
const { NotFoundError, ForbiddenError } = require('../errors');
const bunny = require('./bunny.service');

const listar = (restauranteId, categoriaId) => platosModel.listar(restauranteId, categoriaId);

// La receta y los modificadores son los mismos para staff y comensal; lo que cambia
// es qué plato se deja alcanzar, y de eso se encargan las dos funciones de abajo.
const conRelaciones = async (plato) => {
  const ingredientes = await platosModel.ingredientesDePlato(plato.id);
  const grupos = await platosModel.gruposModificadoresDePlato(plato.id);
  for (const g of grupos) {
    g.opciones = await platosModel.opcionesDeGrupo(g.id);
  }
  return { ...plato, ingredientes, grupos_modificadores: grupos };
};

// Detalle administrativo: acotado al tenant, pero muestra también lo despublicado.
const obtener = async (id, restauranteId = null) => {
  const plato = await platosModel.buscarPorId(id, restauranteId);
  if (!plato) throw new NotFoundError('Plato no encontrado');
  return conRelaciones(plato);
};

// Detalle para el comensal: sin sesión, así que el filtro de publicado y de
// restaurante activo lo pone la consulta. Antes esta ruta servía cualquier id.
const obtenerPublico = async (id) => {
  const plato = await platosModel.buscarPublicoPorId(id);
  if (!plato) throw new NotFoundError('Plato no encontrado');
  return conRelaciones(plato);
};

// La categoría es la que ata el plato a un tenant, así que aceptarla del cliente sin
// comprobarla dejaría crear o mover platos dentro de la carta de otro restaurante.
const asegurarCategoriaPropia = async (categoriaId, restauranteId) => {
  if (categoriaId === undefined || restauranteId == null) return;
  const categoria = await categoriasModel.buscarPorId(categoriaId, restauranteId);
  if (!categoria) throw new NotFoundError('Categoria no encontrada');
};

const crear = async (datos, restauranteId = null) => {
  await asegurarCategoriaPropia(datos.categoria_id, restauranteId);
  const id = await platosModel.crear(datos);
  return platosModel.buscarPorId(id, restauranteId);
};

const actualizar = async (id, datos, restauranteId = null) => {
  await asegurarCategoriaPropia(datos.categoria_id, restauranteId);

  // Necesitamos el estado previo por dos razones: saber si hay que borrar el video
  // anterior en Bunny, y poder conservar la programación del chef si no se envió.
  const previo = await platosModel.programacionChef(id, restauranteId);
  if (!previo) throw new NotFoundError('Plato no encontrado');

  // Para los campos de programación no vale COALESCE: así el usuario SÍ puede
  // limpiarlos (poner NULL). undefined = no se envió → se conserva el valor previo.
  const conservar = (nuevo, viejo) => (nuevo === undefined ? viejo : nuevo || null);

  await platosModel.actualizar(
    id,
    datos,
    {
      dias: conservar(datos.recomendado_dias, previo.recomendado_dias),
      horaInicio: conservar(datos.recomendado_hora_inicio, previo.recomendado_hora_inicio),
      horaFin: conservar(datos.recomendado_hora_fin, previo.recomendado_hora_fin),
    },
    restauranteId
  );

  // Si el video cambió, el anterior queda huérfano en Bunny: se libera.
  // No bloquea la respuesta; si falla, solo se registra.
  if (datos.video_guid && previo.video_guid && datos.video_guid !== previo.video_guid) {
    await bunny.eliminar(previo.video_guid);
  }

  return platosModel.buscarPorId(id, restauranteId);
};

const eliminar = async (id, restauranteId = null) => {
  const plato = await platosModel.buscarPorId(id, restauranteId);
  if (!plato) throw new NotFoundError('Plato no encontrado');

  await bunny.eliminar(plato.video_guid); // libera el storage en Bunny
  await platosModel.eliminar(id, restauranteId);
};

// Garantiza que el restaurante tenga su colección en Bunny (se crea la primera vez).
const asegurarColeccion = async (restauranteId) => {
  const rest = await platosModel.coleccionBunny(restauranteId);
  if (!rest) throw new NotFoundError('Restaurante no encontrado');
  if (rest.bunny_collection_id) return rest.bunny_collection_id;

  const collectionId = await bunny.crearColeccion(rest.nombre || `Restaurante ${restauranteId}`);
  await platosModel.guardarColeccionBunny(restauranteId, collectionId);
  return collectionId;
};

// Crea el objeto de video en Bunny y devuelve la credencial firmada para subir por TUS.
const solicitarSubidaVideo = async (restauranteId, titulo) => {
  const collectionId = await asegurarColeccion(restauranteId);
  return bunny.crearSubida(titulo, collectionId);
};

const estadoVideo = (guid) => bunny.estado(guid);

// Las tablas puente no saben de tenants, así que la pertenencia del plato se
// comprueba aquí antes de reescribirlas.
const asegurarPlatoPropio = async (platoId, restauranteId) => {
  const plato = await platosModel.buscarPorId(platoId, restauranteId);
  if (!plato) throw new NotFoundError('Plato no encontrado');
};

// Reemplaza la receta completa del plato (lista de ingredientes usados)
const setIngredientes = async (platoId, ingredientes, restauranteId = null) => {
  await asegurarPlatoPropio(platoId, restauranteId);
  return platosModel.reemplazarIngredientes(platoId, ingredientes);
};

// Reemplaza los grupos de modificadores aplicables al plato (ej. "Elige tu proteina")
const setGruposModificadores = async (platoId, grupoIds, restauranteId = null) => {
  await asegurarPlatoPropio(platoId, restauranteId);
  return platosModel.reemplazarGruposModificadores(platoId, grupoIds);
};

// Publico: feed de video del menu, resuelto a partir del token de QR de la mesa
const feedPublico = async (token) => {
  const contexto = await platosModel.restaurantePorTokenQr(token);
  if (!contexto) throw new NotFoundError('Codigo QR invalido');
  if (contexto.estado !== 'activo') {
    throw new ForbiddenError('Restaurante no disponible por el momento');
  }
  return platosModel.feedPorRestaurante(contexto.restaurante_id);
};

// Publico: el MISMO feed, entrando por el slug del restaurante. La carta que ve
// quien llega desde Instagram es exactamente la que ve quien escanea el QR.
const feedPorSlug = async (slug) => {
  const contexto = await platosModel.restaurantePorSlug(slug);
  if (!contexto) throw new NotFoundError('Restaurante no encontrado');
  if (contexto.estado !== 'activo') {
    throw new ForbiddenError('Restaurante no disponible por el momento');
  }
  return platosModel.feedPorRestaurante(contexto.restaurante_id);
};

module.exports = {
  listar,
  obtener,
  obtenerPublico,
  crear,
  actualizar,
  eliminar,
  setIngredientes,
  setGruposModificadores,
  feedPublico,
  feedPorSlug,
  solicitarSubidaVideo,
  estadoVideo,
};
