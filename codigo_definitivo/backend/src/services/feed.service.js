const feedModel = require('../models/feed.model');
const socialModel = require('../models/social.model');
const orden = require('./feed/orden');
const { url } = require('./seo/html');
const { BadRequestError, NotFoundError } = require('../errors');

// El feed de la app: GET /api/app/v1/feed y lo que cuelga de él.
//
// CÓMO SE ARMA
//   1. El catálogo (todos los platos que se pueden enseñar) se pide a la base una
//      vez por minuto y se guarda en memoria. Con un VPS de 1 vCPU, una consulta
//      por minuto y no una por página es lo que deja al panel y al KDS en paz.
//   2. Cada sesión de feed tiene un CORTE: la hora de la base en que empezó. Lo
//      publicado después no entra en esa sesión, así que no corre las posiciones
//      mientras alguien desliza (eso daría platos repetidos).
//   3. Con los antojos y el corte se filtra e intercala el catálogo, y la lista de
//      ids resultante se guarda un rato: las páginas siguientes la leen igual.
//   4. Cada página sale de esa lista y se completa con los datos sociales
//      ("me gusta", comentarios y lo que marcó quien pregunta) en dos consultas
//      agrupadas por página.
//
// Si un plato se despublica a mitad de una sesión, desaparece de las páginas
// que falten (se busca en el catálogo vigente): esa página trae uno menos, pero
// nunca un plato que el restaurante ya quitó. Lo que no puede pasar es repetir.

const TTL_CATALOGO_MS = 60 * 1000;
const TTL_LISTA_MS = 30 * 60 * 1000;
const MAX_LISTAS = 300;
const MAX_GUARDADOS = 200;

let catalogo = null;
let pidiendo = null;

function prepararCatalogo({ ahora, platos }) {
  const lista = platos.map((p) => ({
    ...p,
    precio: Number(p.precio),
    nivel_picante: Number(p.nivel_picante) || 0,
    recomendado_chef: Boolean(Number(p.recomendado_chef)),
    categoria_normalizada: p.categoria ? orden.normalizar(p.categoria) : null,
  }));

  // Los restaurantes del catálogo, del que publicó más recientemente al que
  // menos, con hasta tres miniaturas reales de sus platos para su tarjeta.
  const restaurantes = new Map();
  for (const p of lista) {
    let r = restaurantes.get(p.restaurante_slug);
    if (!r) {
      r = {
        slug: p.restaurante_slug,
        nombre: p.restaurante_nombre,
        ciudad: p.restaurante_ciudad || null,
        descripcion: p.restaurante_descripcion || null,
        logo: p.restaurante_logo || null,
        total: 0,
        miniaturas: [],
      };
      restaurantes.set(p.restaurante_slug, r);
    }
    r.total += 1;
    const miniatura = p.video_thumbnail_url || p.imagen_url;
    if (miniatura && r.miniaturas.length < 3) r.miniaturas.push(miniatura);
  }

  return {
    ahora,
    platos: lista,
    porId: new Map(lista.map((p) => [p.id, p])),
    opciones: orden.opciones(lista, [...restaurantes.values()]),
    exp: Date.now() + TTL_CATALOGO_MS,
  };
}

// Varias peticiones a la vez con la caché vencida comparten UNA consulta.
async function catalogoVigente() {
  if (catalogo && catalogo.exp > Date.now()) return catalogo;
  if (!pidiendo) {
    pidiendo = feedModel
      .elegibles()
      .then((datos) => {
        catalogo = prepararCatalogo(datos);
        return catalogo;
      })
      .finally(() => {
        pidiendo = null;
      });
  }
  return pidiendo;
}

// Listas ya ordenadas, por (corte, antojos). Map conserva el orden de inserción,
// así que la primera clave es la más vieja: es la que sale cuando se llena.
const listas = new Map();

function listaOrdenada(cat, antojos, corte) {
  const clave = `${corte}|${antojos.clave}`;
  const guardada = listas.get(clave);
  if (guardada && guardada.exp > Date.now()) return guardada.ids;

  const hastaElCorte = cat.platos.filter((p) => p.publicado_en <= corte);
  const ids = orden.intercalar(orden.filtrar(hastaElCorte, antojos.porTipo)).map((p) => p.id);

  listas.delete(clave);
  while (listas.size >= MAX_LISTAS) listas.delete(listas.keys().next().value);
  listas.set(clave, { ids, exp: Date.now() + TTL_LISTA_MS });
  return ids;
}

/** Vacía las cachés. Lo usan las pruebas y quien necesite ver un cambio ya. */
function olvidar() {
  catalogo = null;
  listas.clear();
}

// --- Forma de cada plato en la respuesta ---

const dueno = (quien) => (quien?.comensalId ? `c:${quien.comensalId}` : quien?.dispositivoId || null);

function formatear(p, social) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || null,
    precio: p.precio,
    moneda: p.moneda,
    categoria: p.categoria || null,
    video_url: p.video_url,
    video_thumbnail_url: p.video_thumbnail_url || null,
    imagen_url: p.imagen_url || null,
    duracion_segundos: p.duracion_segundos ?? null,
    nivel_picante: p.nivel_picante,
    recomendado_chef: p.recomendado_chef,
    restaurante: {
      slug: p.restaurante_slug,
      nombre: p.restaurante_nombre,
      ciudad: p.restaurante_ciudad || null,
      logo: p.restaurante_logo || null,
    },
    social,
    // La vitrina web ya abre en este plato; cuando haya enlaces universales,
    // abrirá la app si está instalada.
    compartir_url: url(`/r/${encodeURIComponent(p.restaurante_slug)}?plato=${p.id}`),
  };
}

/** Los platos con sus datos sociales, en el mismo orden en que llegaron. */
async function decorar(platos, quien) {
  const ids = platos.map((p) => p.id);
  const d = dueno(quien);
  const [meGusta, comentarios, mios, guardados] = await Promise.all([
    socialModel.contarMeGusta(ids),
    socialModel.contarComentarios(ids),
    socialModel.meGustaDe(d, ids),
    socialModel.guardadosDe(d, ids),
  ]);
  return platos.map((p) =>
    formatear(p, {
      me_gusta: meGusta.get(p.id) ?? 0,
      comentarios: comentarios.get(p.id) ?? 0,
      me_gusta_yo: mios.has(p.id),
      guardado_yo: guardados.has(p.id),
    })
  );
}

// --- Lo que exponen las rutas ---

/**
 * Una página del feed. Sin cursor empieza una sesión nueva (con el corte de
 * ahora); con cursor sigue la que el cursor describe. Un cursor que no casa con
 * los antojos (la app los cambió y no empezó de cero) se rechaza con un código
 * que la app reconoce para volver a pedir la primera página.
 */
async function pagina({ antojos: entrada, cursor, limite }, quien) {
  const antojos = orden.parsearAntojos(entrada);
  const cat = await catalogoVigente();

  let corte = cat.ahora;
  let desplazamiento = 0;
  if (cursor) {
    const leido = orden.decodificarCursor(cursor, antojos.clave);
    if (!leido) throw new BadRequestError('El feed cambió. Vuelve a cargarlo.', { codigo: 'CURSOR_INVALIDO' });
    ({ corte, desplazamiento } = leido);
  }

  const ids = listaOrdenada(cat, antojos, corte);
  const siguiente = desplazamiento + limite < ids.length ? desplazamiento + limite : null;
  const platos = ids
    .slice(desplazamiento, desplazamiento + limite)
    .map((id) => cat.porId.get(id))
    .filter(Boolean);

  return {
    items: await decorar(platos, quien),
    total: ids.length,
    hay_mas: siguiente !== null,
    cursor: siguiente === null ? null : orden.codificarCursor({ corte, desplazamiento: siguiente, clave: antojos.clave }),
  };
}

/** Cuántos platos coinciden con unos antojos: el contador en vivo de la hoja ANTOJATE. */
async function conteo({ antojos: entrada }) {
  const antojos = orden.parsearAntojos(entrada);
  const cat = await catalogoVigente();
  return { total: orden.filtrar(cat.platos, antojos.porTipo).length };
}

/** Las opciones de la hoja ANTOJATE y los restaurantes del catálogo. */
async function opciones() {
  return (await catalogoVigente()).opciones;
}

/** Un plato suelto, con la misma forma que en el feed (para un enlace o la ficha). */
async function plato(id, quien) {
  const p = (await catalogoVigente()).porId.get(Number(id));
  if (!p) throw new NotFoundError('Este plato ya no está en la app');
  const [item] = await decorar([p], quien);
  return item;
}

/** ¿Este plato se puede enseñar en la app? Lo preguntan las acciones sociales. */
async function esPublico(id) {
  return (await catalogoVigente()).porId.has(Number(id));
}

/** Los platos guardados por quien pregunta, con la forma del feed. */
async function guardados(quien) {
  const d = dueno(quien);
  if (!d) return { items: [] };
  const cat = await catalogoVigente();
  // Un guardado cuyo plato ya no se publica no se enseña: no hay video que ver.
  const platos = (await socialModel.listarGuardados(d, MAX_GUARDADOS)).map((id) => cat.porId.get(id)).filter(Boolean);
  return { items: await decorar(platos, quien) };
}

module.exports = { pagina, conteo, opciones, plato, esPublico, guardados, decorar, dueno, olvidar };
