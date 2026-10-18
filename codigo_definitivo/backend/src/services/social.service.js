const socialModel = require('../models/social.model');
const feed = require('./feed.service');
const { BadRequestError, NotFoundError, TooManyRequestsError } = require('../errors');

// La capa social de la app: "me gusta", guardados, comentarios, reportes y
// bloqueos (APP_MOVIL.md, fase 2 y decisión D6).
//
// "Me gusta" y guardados no exigen cuenta: son del teléfono hasta que la persona
// entra, y entonces pasan a la cuenta (ver `adoptarDispositivo`). Comentar,
// reportar y bloquear sí la exigen: sin identidad no hay a quién bloquear, y
// las tiendas lo piden (App Store 1.2).

// Con tantos reportes de personas distintas, un comentario se oculta solo hasta
// que el restaurante lo revise. Tres y no uno: un solo reporte puede ser una
// pelea entre dos personas; tres ya es una señal.
const REPORTES_PARA_OCULTAR = 3;
// Tope de comentarios por cuenta, contra el spam: de sobra para conversar.
const MAX_COMENTARIOS = 10;
const MINUTOS_VENTANA = 10;
const POR_PAGINA = 20;

function exigirDueno(quien) {
  const d = feed.dueno(quien);
  // La app manda siempre X-Dispositivo; sin él no hay a quién atribuir la marca.
  if (!d) throw new BadRequestError('Falta identificar el dispositivo (cabecera X-Dispositivo).');
  return d;
}

async function exigirPlatoPublico(platoId) {
  if (!(await feed.esPublico(platoId))) throw new NotFoundError('Este plato ya no está en la app');
}

// --- Me gusta ---

/** Marca o quita el "me gusta". Idempotente: repetirlo deja el mismo estado. */
async function meGusta(platoId, valor, quien) {
  const d = exigirDueno(quien);
  await exigirPlatoPublico(platoId);
  if (valor) await socialModel.marcarMeGusta({ dueno: d, comensalId: quien.comensalId, platoId });
  else await socialModel.quitarMeGusta({ dueno: d, platoId });
  const totales = await socialModel.contarMeGusta([platoId]);
  return { me_gusta: valor, total: totales.get(platoId) ?? 0 };
}

// --- Guardados ---

async function guardado(platoId, valor, quien) {
  const d = exigirDueno(quien);
  if (valor) {
    await exigirPlatoPublico(platoId);
    await socialModel.guardar({ dueno: d, comensalId: quien.comensalId, platoId });
  } else {
    // Quitar un guardado se deja aunque el plato ya no esté publicado: es la
    // única forma de limpiarlo de la lista.
    await socialModel.quitarGuardado({ dueno: d, platoId });
  }
  return { guardado: valor };
}

// --- Al entrar o registrarse ---

/**
 * Lo que este teléfono marcó sin cuenta pasa a la cuenta (D6). No interrumpe el
 * acceso si falla: los "me gusta" se quedan del lado del teléfono, que es mejor
 * que no dejar entrar a nadie.
 */
async function adoptarDispositivo(dispositivoId, comensalId) {
  if (!dispositivoId || !comensalId) return;
  try {
    await socialModel.adoptarDispositivo({ dispositivoId, comensalId });
  } catch (err) {
    console.error(`[social] no se pudo pasar lo del teléfono a la cuenta ${comensalId}: ${err.message}`);
  }
}

// --- Comentarios ---

// "Juan José Arango" → "Juan A.". Basta para conversar y no publica el nombre
// completo de nadie.
function nombreCorto(nombre) {
  const partes = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return 'Alguien';
  const primero = partes[0].charAt(0).toUpperCase() + partes[0].slice(1);
  const inicial = partes.length > 1 ? ` ${partes[partes.length - 1].charAt(0).toUpperCase()}.` : '';
  return `${primero}${inicial}`;
}

const formatearComentario = (c, comensalId) => ({
  id: c.id,
  texto: c.texto,
  creado_en: c.creado_en,
  // Para "hace 5 min" sin depender de zonas horarias (ver models/social.model.js).
  hace_segundos: Math.max(0, Number(c.hace_segundos) || 0),
  autor: { nombre: nombreCorto(c.autor_nombre) },
  mio: Boolean(comensalId) && Number(c.comensal_id) === Number(comensalId),
});

// El cursor de los comentarios es el id del último que se vio, en base64 para
// que la app no le dé significado.
const cursorComentarios = (id) => Buffer.from(String(id)).toString('base64url');
function leerCursorComentarios(texto) {
  if (!texto) return null;
  const id = Number(Buffer.from(String(texto), 'base64url').toString('utf8'));
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Cursor inválido', { codigo: 'CURSOR_INVALIDO' });
  return id;
}

async function comentarios(platoId, { cursor }, quien) {
  await exigirPlatoPublico(platoId);
  const comensalId = quien?.comensalId ?? null;
  const filas = await socialModel.listarComentarios({
    platoId,
    antesDe: leerCursorComentarios(cursor),
    limite: POR_PAGINA + 1,
    comensalId,
  });
  const pagina = filas.slice(0, POR_PAGINA);
  const total = await socialModel.contarComentariosPara({ platoId, comensalId });
  return {
    items: pagina.map((c) => formatearComentario(c, comensalId)),
    total,
    hay_mas: filas.length > POR_PAGINA,
    cursor: filas.length > POR_PAGINA ? cursorComentarios(pagina[pagina.length - 1].id) : null,
  };
}

async function comentar(platoId, texto, quien) {
  await exigirPlatoPublico(platoId);
  const recientes = await socialModel.comentariosRecientes(quien.comensalId, MINUTOS_VENTANA);
  if (recientes >= MAX_COMENTARIOS) {
    throw new TooManyRequestsError('Escribiste muchos comentarios seguidos. Espera unos minutos.');
  }
  const id = await socialModel.crearComentario({ platoId, comensalId: quien.comensalId, texto });
  return formatearComentario(await socialModel.buscarComentario(id), quien.comensalId);
}

async function eliminarComentario(id, quien) {
  const borrados = await socialModel.eliminarComentarioPropio({ id, comensalId: quien.comensalId });
  // Mismo 404 para "no existe" y "no es tuyo": no se confirma que exista.
  if (!borrados) throw new NotFoundError('Comentario no encontrado');
}

// --- Reportes y bloqueos ---

async function reportar({ comentario_id: comentarioId, motivo, detalle }, quien) {
  const comentario = await socialModel.buscarComentario(comentarioId);
  if (!comentario) throw new NotFoundError('Comentario no encontrado');
  if (Number(comentario.comensal_id) === Number(quien.comensalId)) {
    throw new BadRequestError('No puedes reportar tu propio comentario. Puedes borrarlo.');
  }
  await socialModel.reportar({ comentarioId, comensalId: quien.comensalId, motivo, detalle });
  if ((await socialModel.reportesPendientes(comentarioId)) >= REPORTES_PARA_OCULTAR) {
    await socialModel.ocultarPorReportes(comentarioId);
  }
  return { reportado: true };
}

// Se bloquea a partir de un comentario: así la app nunca necesita conocer el id
// de cuenta de nadie.
async function bloquear({ comentario_id: comentarioId }, quien) {
  const comentario = await socialModel.buscarComentario(comentarioId);
  if (!comentario) throw new NotFoundError('Comentario no encontrado');
  if (Number(comentario.comensal_id) === Number(quien.comensalId)) {
    throw new BadRequestError('No puedes bloquearte a ti mismo.');
  }
  await socialModel.bloquear({ comensalId: quien.comensalId, bloqueadoId: comentario.comensal_id });
  return { bloqueado: true };
}

// --- Moderación desde el panel ---

const POR_PAGINA_MODERACION = 50;

async function paraModerar(restauranteId, { estado, reportados, pagina = 1 }) {
  const filas = await socialModel.listarParaModerar({
    restauranteId,
    estado: estado || null,
    soloReportados: Boolean(reportados),
    limite: POR_PAGINA_MODERACION,
    desplazamiento: (pagina - 1) * POR_PAGINA_MODERACION,
  });
  return filas.map((c) => ({
    id: c.id,
    texto: c.texto,
    estado: c.estado,
    creado_en: c.creado_en,
    moderado_en: c.moderado_en,
    plato: { id: c.plato_id, nombre: c.plato_nombre },
    autor: { nombre: nombreCorto(c.autor_nombre) },
    reportes: Number(c.reportes),
    motivos: c.motivos ? c.motivos.split(',') : [],
  }));
}

async function moderar(id, estado, usuarioId, restauranteId) {
  if (!(await socialModel.moderar({ id, estado, usuarioId, restauranteId }))) {
    throw new NotFoundError('Comentario no encontrado');
  }
}

async function eliminarModerado(id, restauranteId) {
  if (!(await socialModel.eliminarComentario({ id, restauranteId }))) {
    throw new NotFoundError('Comentario no encontrado');
  }
}

module.exports = {
  REPORTES_PARA_OCULTAR,
  nombreCorto,
  meGusta,
  guardado,
  adoptarDispositivo,
  comentarios,
  comentar,
  eliminarComentario,
  reportar,
  bloquear,
  paraModerar,
  moderar,
  eliminarModerado,
};
