// Directorio público de restaurantes: /restaurantes y /restaurantes/:ciudad.
//
// POR QUÉ EXISTE
// Las vitrinas /r/:slug eran páginas huérfanas: estaban en el sitemap pero no
// había un solo enlace en el sitio apuntándolas. Un buscador las trata como
// contenido de segunda, y un visitante no tenía forma de llegar a ninguna. El
// directorio es la página que las enlaza y las agrupa.
//
// LA PUERTA DE CALIDAD
// Esto es SEO programático: páginas generadas a partir de filas de una base de
// datos. Hecho sin criterio produce cientos de páginas casi vacías, que es lo
// que Google penaliza y lo que hace que un dominio entero pierda confianza. Por
// eso aquí nada se indexa por el hecho de existir:
//
//   · un restaurante entra al directorio si tiene una carta de verdad
//     (MIN_PLATOS platos publicados), no por estar dado de alta;
//   · una página de ciudad solo existe si hay MIN_RESTAURANTES_CIUDAD en ella.
//     Con uno solo, la página de ciudad sería una copia de la ficha de ese
//     restaurante: contenido duplicado y una página puerta de manual;
//   · el propio directorio se sirve siempre —hace falta para navegar— pero se
//     marca `noindex` mientras no tenga suficientes fichas. Se indexa solo
//     cuando las tenga, sin que nadie toque el código.
//
// Es decir: la arquitectura está montada para escalar a cientos de restaurantes,
// y hasta que los haya no publica páginas flacas.

const restaurantesModel = require('../../models/restaurantes.model');
const { NotFoundError } = require('../../errors');
const {
  SITIO,
  esc,
  url,
  recortar,
  ensamblar,
  navegacion,
  pie,
  migas,
  schemaMigas,
  ID_ORGANIZACION,
  ID_SITIO,
} = require('./html');

const MIN_PLATOS = 4;
const MIN_RESTAURANTES_CIUDAD = 3;
const MIN_PARA_INDEXAR = 3;

// "Medellín" → "medellin". Misma normalización que hace la migración del slug
// del restaurante, para que las dos produzcan la misma forma.
const slugCiudad = (ciudad) =>
  String(ciudad || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas de acento, ya separadas por NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Restaurantes que superan la puerta de calidad. */
async function publicables() {
  const filas = await restaurantesModel.listarPublicos();
  return filas
    .filter((r) => Number(r.platos) >= MIN_PLATOS)
    .map((r) => ({
      nombre: r.nombre,
      slug: r.slug,
      ciudad: r.ciudad || null,
      ciudadSlug: r.ciudad ? slugCiudad(r.ciudad) : null,
      descripcion: r.descripcion || null,
      logo: r.logo_url || null,
      platos: Number(r.platos),
      // 'YYYY-MM-DD HH:MM:SS' (dateStrings del pool) → 'YYYY-MM-DD'. El sitemap
      // solo necesita el día, y así no hay que adivinar la zona horaria.
      actualizado: r.actualizado_en ? String(r.actualizado_en).slice(0, 10) : null,
    }));
}

// La fecha más reciente de una lista de restaurantes: una página que los lista
// cambió cuando cambió el último de ellos.
const masReciente = (lista) =>
  lista.reduce((max, r) => (r.actualizado && r.actualizado > max ? r.actualizado : max), '') || null;

/** Ciudades con suficientes restaurantes para merecer su propia página. */
function ciudadesConPagina(lista) {
  const porCiudad = new Map();
  for (const r of lista) {
    if (!r.ciudadSlug) continue;
    if (!porCiudad.has(r.ciudadSlug)) porCiudad.set(r.ciudadSlug, { nombre: r.ciudad, slug: r.ciudadSlug, items: [] });
    porCiudad.get(r.ciudadSlug).items.push(r);
  }
  return [...porCiudad.values()].filter((c) => c.items.length >= MIN_RESTAURANTES_CIUDAD);
}

// --- Contenido ---

const ficha = (r) => {
  const detalle = r.descripcion
    ? recortar(r.descripcion, 180)
    : `Carta con ${r.platos} platos${r.ciudad ? ` en ${r.ciudad}` : ''}, cada uno con su video.`;

  return `<li>
      <h3><a href="${esc(url(`/r/${r.slug}`))}">${esc(r.nombre)}</a></h3>
      ${r.ciudad ? `<p>${esc(r.ciudad)}</p>` : ''}
      <p>${esc(detalle)}</p>
    </li>`;
};

// ItemList del listado. Es lo que permite que un asistente responda "qué
// restaurantes usan Antojate" con la lista real en vez de deducirla del texto.
const schemaListado = (lista, rutaPagina, nombre) => ({
  '@type': 'CollectionPage',
  '@id': `${url(rutaPagina)}#pagina`,
  url: url(rutaPagina),
  name: nombre,
  inLanguage: 'es',
  isPartOf: { '@id': ID_SITIO },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: lista.length,
    itemListElement: lista.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: url(`/r/${r.slug}`),
      name: r.nombre,
    })),
  },
});

/** /restaurantes */
async function indice(plantilla) {
  const lista = await publicables();
  const ciudades = ciudadesConPagina(lista);
  const indexable = lista.length >= MIN_PARA_INDEXAR;

  const titulo = 'Restaurantes con menú digital en Antojate';
  const descripcion = lista.length
    ? recortar(
        `Cartas digitales con video de ${lista.length} restaurante${lista.length === 1 ? '' : 's'} en Antojate: platos, precios y video de cada plato.`
      )
    : 'Directorio de los restaurantes que publican su carta digital con video en Antojate.';

  const camino = [
    { nombre: 'Antojate', ruta: '/' },
    { nombre: 'Restaurantes', ruta: '/restaurantes' },
  ];

  const cuerpo = `${navegacion()}
    ${migas(camino)}
    <main>
      <h1>${esc(titulo)}</h1>
      <p>Cada restaurante publica aquí su carta completa: los platos que sirve, sus precios y el video de cada uno. Son cartas reales, mantenidas por el propio restaurante desde su panel.</p>
      ${
        lista.length
          ? `<ul>${lista.map(ficha).join('')}</ul>`
          : '<p>Todavía no hay ninguna carta publicada.</p>'
      }
      ${
        ciudades.length
          ? `<section><h2>Por ciudad</h2><ul>${ciudades
              .map(
                (c) =>
                  `<li><a href="${esc(url(`/restaurantes/${c.slug}`))}">Restaurantes en ${esc(
                    c.nombre
                  )}</a></li>`
              )
              .join('')}</ul></section>`
          : ''
      }
    </main>
    ${pie([
      { ruta: '/menu-digital-con-video', texto: 'Qué es un menú digital con video' },
      { ruta: '/guias', texto: 'Guías para restaurantes' },
    ])}`;

  return ensamblar(plantilla, {
    titulo: `${titulo} | Antojate`,
    descripcion,
    canonical: url('/restaurantes'),
    // Mientras el directorio tenga menos de tres fichas es una página flaca, y
    // una página flaca indexada resta en vez de sumar. Se sirve igual —hace
    // falta para navegar y para que se rastreen las vitrinas— pero pidiendo que
    // no se indexe. `follow` es deliberado: que no la indexen, pero que sí
    // sigan los enlaces hacia cada /r/:slug, que sí tienen contenido.
    robots: indexable ? null : 'noindex, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [schemaListado(lista, '/restaurantes', titulo), schemaMigas(camino)],
    },
    cuerpo,
  });
}

/** /restaurantes/:ciudad */
async function porCiudad(plantilla, ciudadSlug) {
  const lista = await publicables();
  const ciudad = ciudadesConPagina(lista).find((c) => c.slug === ciudadSlug);

  // Una ciudad sin suficientes restaurantes no tiene página. No es un error de
  // datos: es la puerta de calidad haciendo su trabajo, y responder 404 es más
  // honesto que publicar una página vacía que luego habría que despublicar.
  if (!ciudad) throw new NotFoundError('Ciudad sin restaurantes publicados');

  const titulo = `Restaurantes con menú digital en ${ciudad.nombre}`;
  const camino = [
    { nombre: 'Antojate', ruta: '/' },
    { nombre: 'Restaurantes', ruta: '/restaurantes' },
    { nombre: ciudad.nombre, ruta: `/restaurantes/${ciudad.slug}` },
  ];

  const cuerpo = `${navegacion()}
    ${migas(camino)}
    <main>
      <h1>${esc(titulo)}</h1>
      <p>${esc(
        `${ciudad.items.length} restaurantes de ${ciudad.nombre} publican su carta digital en Antojate, con los platos, los precios y el video de cada plato.`
      )}</p>
      <ul>${ciudad.items.map(ficha).join('')}</ul>
      <p><a href="${url('/restaurantes')}">Ver todos los restaurantes</a></p>
    </main>
    ${pie([{ ruta: '/menu-digital-con-video', texto: 'Qué es un menú digital con video' }])}`;

  return ensamblar(plantilla, {
    titulo: `${titulo} | Antojate`,
    descripcion: recortar(
      `Cartas digitales con video de ${ciudad.items.length} restaurantes en ${ciudad.nombre}: ${ciudad.items
        .slice(0, 4)
        .map((r) => r.nombre)
        .join(', ')}.`
    ),
    canonical: url(`/restaurantes/${ciudad.slug}`),
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          ...schemaListado(ciudad.items, `/restaurantes/${ciudad.slug}`, titulo),
          about: {
            '@type': 'City',
            name: ciudad.nombre,
            containedInPlace: { '@type': 'Country', name: 'Colombia' },
          },
        },
        schemaMigas(camino),
        { '@type': 'Organization', '@id': ID_ORGANIZACION },
      ],
    },
    cuerpo,
  });
}

/** URLs del directorio que sí deben entrar al sitemap. */
async function urlsIndexables() {
  const lista = await publicables();
  const urls = lista.map((r) => ({
    loc: url(`/r/${r.slug}`),
    prioridad: '0.8',
    frecuencia: 'weekly',
    lastmod: r.actualizado,
  }));

  if (lista.length >= MIN_PARA_INDEXAR) {
    urls.unshift({ loc: url('/restaurantes'), prioridad: '0.7', frecuencia: 'weekly', lastmod: masReciente(lista) });
  }
  for (const c of ciudadesConPagina(lista)) {
    urls.push({
      loc: url(`/restaurantes/${c.slug}`),
      prioridad: '0.6',
      frecuencia: 'weekly',
      lastmod: masReciente(c.items),
    });
  }
  return urls;
}

module.exports = {
  SITIO,
  MIN_PLATOS,
  MIN_RESTAURANTES_CIUDAD,
  MIN_PARA_INDEXAR,
  slugCiudad,
  publicables,
  ciudadesConPagina,
  indice,
  porCiudad,
  urlsIndexables,
};
