// La vitrina pública de un restaurante: /r/:slug.
//
// Bitemo es una SPA: Nginx sirve el mismo index.html para toda URL y el
// contenido lo pinta React DESPUÉS, en el navegador. Para un visitante da igual;
// para quien no ejecuta JavaScript, la página está en blanco. Y no ejecutan
// JavaScript:
//   · los previsualizadores de WhatsApp, Facebook y X al compartir un enlace,
//   · y sobre todo los rastreadores de los buscadores con IA (ChatGPT, Perplexity,
//     Claude, las respuestas generadas de Google), que leen el HTML tal cual llega.
// Google sí renderiza, pero tarde y no siempre.
//
// Así que el servidor arma aquí un HTML que ya trae el nombre, la ciudad, la carta
// completa con precios y el JSON-LD. React lo reemplaza al montar, de modo que el
// visitante ve la experiencia de siempre y el rastreador ve la carta.

const temasModel = require('../../models/temas.model');
const platosModel = require('../../models/platos.model');
const { NotFoundError } = require('../../errors');
const {
  SITIO,
  esc,
  url,
  recortar,
  dinero,
  ensamblar,
  migas,
  schemaMigas,
  ID_ORGANIZACION,
} = require('./html');

// Tope de VideoObject por página. Una carta de 60 platos generaría 60 bloques de
// video y el JSON-LD pesaría más que el HTML. Se declaran los primeros, que son
// los que el propio restaurante puso al principio de su carta. NO es un límite
// silencioso: los platos siguen todos en el menú y en el HTML, lo único que se
// recorta es la ficha de video de los últimos.
const MAX_VIDEOS_DECLARADOS = 25;

// Agrupa el feed por categoría conservando el orden en que viene, que ya es el
// que definió el restaurante.
function porCategoria(platos) {
  const mapa = new Map();
  for (const p of platos) {
    const nombre = p.categoria || 'Carta';
    if (!mapa.has(nombre)) mapa.set(nombre, []);
    mapa.get(nombre).push(p);
  }
  return [...mapa.entries()];
}

// Reúne todo lo que necesita la página: restaurante + carta.
async function datosDeVitrina(slug) {
  const restaurante = await temasModel.contextoPorSlug(slug);
  if (!restaurante || restaurante.estado !== 'activo') {
    throw new NotFoundError('Restaurante no encontrado');
  }
  const platos = await platosModel.feedPorRestaurante(restaurante.restaurante_id);
  return { restaurante, platos };
}

// --- Metadatos ---

function metadatos({ restaurante, platos }) {
  const nombre = restaurante.restaurante_nombre;
  const ciudad = restaurante.ciudad;
  const url = `${SITIO}/r/${restaurante.slug}`;

  // "Menú de X en Medellín" y no solo "Menú de X": las búsquedas que un
  // restaurante puede ganar son locales, y sin la ciudad no compite por ninguna.
  const titulo = ciudad
    ? `${nombre} en ${ciudad} — Menú, platos y carta`
    : `${nombre} — Menú, platos y carta`;

  // La descripción propia manda. Si no la hay, se arma con los platos REALES, que
  // es lo que hace la página distinta de las demás: una plantilla igual para todos
  // los restaurantes es contenido duplicado, y eso hunde a un sitio entero.
  const descripcion = restaurante.descripcion
    ? recortar(restaurante.descripcion)
    : recortar(
        platos.length
          ? `Carta de ${nombre}${ciudad ? ` en ${ciudad}` : ''}: ${platos
              .slice(0, 6)
              .map((p) => p.nombre)
              .join(', ')}. Mira cada plato en video antes de pedir.`
          : `Carta de ${nombre}${ciudad ? ` en ${ciudad}` : ''} en Bitemo.`
      );

  return { titulo, descripcion, url, imagen: restaurante.logo_url || `${SITIO}/marca/og.png` };
}

// --- Datos estructurados ---

const fechaIso = (valor) => {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

/**
 * VideoObject de un plato.
 *
 * Es la pieza que ningún competidor puede copiar: un menú en PDF no tiene video
 * que declarar. Google exige miniatura, nombre, descripción y fecha de subida;
 * sin cualquiera de las cuatro descarta el bloque entero, así que el plato que
 * no las tenga se queda sin ficha en vez de generar una inválida.
 */
function videoDePlato(plato, restaurante) {
  const subida = fechaIso(plato.creado_en);
  if (!plato.video_url || !plato.video_thumbnail_url || !subida) return null;

  return {
    '@type': 'VideoObject',
    name: `${plato.nombre} — ${restaurante.restaurante_nombre}`,
    description: recortar(
      plato.descripcion || `${plato.nombre}, del menú de ${restaurante.restaurante_nombre}.`,
      200
    ),
    thumbnailUrl: plato.video_thumbnail_url,
    contentUrl: plato.video_url,
    uploadDate: subida,
    inLanguage: 'es',
  };
}

// Schema.org Restaurant + Menu. Es LA pieza que leen los buscadores con IA para
// responder "¿qué tiene X en la carta?" sin visitar la página: le da la carta ya
// entendida, con precios, en vez de obligarles a adivinarla del texto.
function datosEstructurados({ restaurante, platos }, meta) {
  const precios = platos.map((p) => Number(p.precio)).filter((n) => n > 0);
  let videosDeclarados = 0;

  const secciones = porCategoria(platos).map(([categoria, items]) => ({
    '@type': 'MenuSection',
    name: categoria,
    hasMenuItem: items.map((p) => {
      const video = videosDeclarados < MAX_VIDEOS_DECLARADOS ? videoDePlato(p, restaurante) : null;
      if (video) videosDeclarados += 1;

      return {
        '@type': 'MenuItem',
        name: p.nombre,
        ...(p.descripcion ? { description: p.descripcion } : {}),
        ...(p.video_thumbnail_url || p.imagen_url
          ? { image: p.video_thumbnail_url || p.imagen_url }
          : {}),
        offers: {
          '@type': 'Offer',
          price: String(Number(p.precio)),
          priceCurrency: restaurante.moneda || 'COP',
        },
        // El video es "sobre" el plato: subjectOf es la relación correcta y deja
        // el vínculo plato→video explícito, en vez de una lista de videos suelta
        // que habría que emparejar por el nombre.
        ...(video ? { subjectOf: video } : {}),
      };
    }),
  }));

  const restaurantSchema = {
    '@type': 'Restaurant',
    '@id': `${meta.url}#restaurante`,
    name: restaurante.restaurante_nombre,
    url: meta.url,
    description: meta.descripcion,
    ...(restaurante.logo_url ? { image: restaurante.logo_url } : {}),
    ...(restaurante.ciudad
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: restaurante.ciudad,
            addressCountry: 'CO',
          },
        }
      : {}),
    // Rango de precios calculado de la carta real, no un "$$" inventado. Se
    // redondea a pesos enteros: es un indicador de "cuánto cuesta comer aquí", y
    // los centavos ahí solo hacen ruido. El precio exacto de cada plato va en su
    // Offer, sin tocar.
    ...(precios.length
      ? {
          priceRange: `$${dinero(Math.round(Math.min(...precios)))} - $${dinero(
            Math.round(Math.max(...precios))
          )}`,
        }
      : {}),
    ...(secciones.length
      ? {
          hasMenu: {
            '@type': 'Menu',
            name: `Carta de ${restaurante.restaurante_nombre}`,
            inLanguage: 'es',
            hasMenuSection: secciones,
          },
        }
      : {}),
  };

  const camino = [
    { nombre: 'Bitemo', ruta: '/' },
    { nombre: 'Restaurantes', ruta: '/restaurantes' },
    { nombre: restaurante.restaurante_nombre, ruta: `/r/${restaurante.slug}` },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      restaurantSchema,
      schemaMigas(camino),
      // La plataforma que publica la carta, por referencia. Es lo que permite a
      // un buscador entender que estas cartas pertenecen todas a Bitemo.
      { '@type': 'Organization', '@id': ID_ORGANIZACION, name: 'Bitemo', url: `${SITIO}/` },
    ],
  };
}

// --- Contenido rastreable ---

// Va DENTRO de <div id="root">. React lo reemplaza entero al montar, así que el
// visitante nunca lo ve: es la carta escrita en HTML plano para quien no ejecuta
// JavaScript. No es texto oculto ni una versión distinta de la página —dice
// exactamente lo mismo que se ve— y por eso no es encubrimiento.
function contenidoRastreable({ restaurante, platos }, meta) {
  const nombre = esc(restaurante.restaurante_nombre);
  const secciones = porCategoria(platos)
    .map(
      ([categoria, items]) => `
      <section>
        <h2>${esc(categoria)}</h2>
        <ul>
          ${items
            .map(
              (p) => `<li>
            <h3>${esc(p.nombre)}</h3>
            ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
            <p>$${esc(dinero(p.precio))}</p>
          </li>`
            )
            .join('')}
        </ul>
      </section>`
    )
    .join('');

  const camino = [
    { nombre: 'Bitemo', ruta: '/' },
    { nombre: 'Restaurantes', ruta: '/restaurantes' },
    { nombre: restaurante.restaurante_nombre, ruta: `/r/${restaurante.slug}` },
  ];

  return `${migas(camino)}
    <article>
      <h1>${nombre}${restaurante.ciudad ? ` en ${esc(restaurante.ciudad)}` : ''}</h1>
      <p>${esc(meta.descripcion)}</p>
      ${secciones || '<p>Este restaurante todavía no ha publicado su carta.</p>'}
      <p><a href="${esc(url('/restaurantes'))}">Más restaurantes en Bitemo</a> · <a href="${esc(
        url('/')
      )}">Bitemo — menú digital con QR y video para restaurantes</a></p>
    </article>`;
}

// --- Ensamblado ---

/**
 * Toma el index.html construido y le pone lo de este restaurante: título, meta,
 * enlace canónico, tarjetas para compartir, datos estructurados y la carta en
 * HTML plano dentro de #root.
 */
function renderizar(plantilla, datos) {
  const meta = metadatos(datos);

  return ensamblar(plantilla, {
    titulo: meta.titulo,
    descripcion: meta.descripcion,
    canonical: meta.url,
    imagen: meta.imagen,
    tipoOg: 'restaurant.restaurant',
    jsonLd: datosEstructurados(datos, meta),
    cuerpo: contenidoRastreable(datos, meta),
  });
}

module.exports = { datosDeVitrina, renderizar, metadatos, datosEstructurados, videoDePlato, MAX_VIDEOS_DECLARADOS };
