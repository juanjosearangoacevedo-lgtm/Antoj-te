// Primitivas para escribir HTML a mano y ensamblarlo sobre el index.html del build.
//
// Todo lo que sirve el motor SEO pasa por aquí, así que las reglas de escapado
// viven en un solo sitio: si `esc` está mal, está mal en una página; si estuviera
// repartida por cinco archivos, estaría mal en la que se olvidó.

const SITIO = (process.env.SITIO_URL || 'https://bitemo.co').replace(/\/$/, '');

// Escapa lo que va DENTRO de una etiqueta o de un atributo. Buena parte del texto
// que se imprime lo escribe un restaurante desde su panel: sin esto, un plato
// llamado `<img onerror=...>` sería una inyección de HTML en una página pública.
const esc = (valor) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// JSON dentro de <script>: JSON.stringify NO escapa '<', así que una descripción
// que contenga "</script>" cerraría la etiqueta antes de tiempo y el resto del
// JSON pasaría a interpretarse como HTML.
const jsonSeguro = (obj) => JSON.stringify(obj).replaceAll('<', '\\u003c');

// Recorta sin cortar una palabra por la mitad. Google muestra ~155 caracteres de
// la meta description; pasarse no penaliza, pero deja la frase truncada a mitad.
function recortar(texto, max = 155) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
}

const dinero = (valor) => Number(valor || 0).toLocaleString('es-CO');

const url = (ruta = '/') => `${SITIO}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;

// --- Cabecera ---

/**
 * Etiquetas del <head> de una página. Se generan todas juntas para que no pueda
 * quedar un og:title sin su og:url: las vistas previas fallan de formas raras
 * cuando el juego está incompleto.
 */
function cabeceras({ titulo, descripcion, canonical, imagen, tipoOg = 'website', jsonLd, robots }) {
  const img = imagen || url('/marca/og.png');
  return [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    robots ? `<meta name="robots" content="${esc(robots)}" />` : '',
    `<meta property="og:type" content="${esc(tipoOg)}" />`,
    `<meta property="og:site_name" content="Antojate" />`,
    `<meta property="og:locale" content="es_CO" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Antojate — menú digital con QR y video para restaurantes" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(titulo)}" />`,
    `<meta name="twitter:description" content="${esc(descripcion)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    jsonLd ? `<script type="application/ld+json">${jsonSeguro(jsonLd)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ');
}

// --- Ensamblado sobre el index.html construido ---

// El index.html del build ya trae el juego de etiquetas de la portada. Para
// cualquier otra página hay que QUITARLAS antes de poner las suyas: dos <title>
// o dos canonical dejan que el buscador elija, y elegiría el genérico.
function limpiarCabeceraPortada(plantilla) {
  return plantilla
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
    // El `robots` de la plantilla hay que quitarlo SIEMPRE. app.html —que es lo
    // que lee este servicio— lleva `noindex` porque el cascarón vacío no debe
    // indexarse; si se quedara, TODAS las vitrinas de restaurante heredarían un
    // noindex y desaparecerían del buscador sin que nada fallara a la vista.
    .replace(/<meta\s+name="robots"[\s\S]*?\/>/, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/, '')
    .replace(/<meta\s+property="og:[\s\S]*?\/>/g, '')
    .replace(/<meta\s+name="twitter:[\s\S]*?\/>/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
}

/**
 * Toma el index.html construido y devuelve la página concreta: sus cabeceras y
 * su contenido ya escrito dentro de #root.
 *
 * `datos` viaja en un <script type="application/json">. React lo lee al montar y
 * pinta la misma página sin volver a pedirla al servidor: sin eso, la primera
 * vista sería un parpadeo entre el HTML del servidor y el de React. No es
 * ejecutable, así que la CSP `script-src 'self'` no lo bloquea.
 */
function ensamblar(plantilla, { cuerpo, datos, ...meta }) {
  const bloqueDatos = datos
    ? `<script type="application/json" id="datos-pagina">${jsonSeguro(datos)}</script>`
    : '';

  return limpiarCabeceraPortada(plantilla)
    .replace('</head>', `  ${cabeceras(meta)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${cuerpo}</div>${bloqueDatos}`);
}

// --- Piezas de contenido reutilizables ---

// Cabecera y pie que acompañan al contenido rastreable. Son los mismos enlaces
// que pinta React, y existen sobre todo por los ENLACES: un rastreador descubre
// /guias y /restaurantes porque están aquí, no porque estén en el sitemap.
function navegacion() {
  return `<nav aria-label="Principal">
      <a href="${url('/')}">Antojate</a>
      <a href="${url('/menu-digital-con-video')}">Menú con video</a>
      <a href="${url('/menu-qr-para-restaurantes')}">Menú QR</a>
      <a href="${url('/restaurantes')}">Restaurantes</a>
      <a href="${url('/guias')}">Guías</a>
    </nav>`;
}

function pie(relacionadas = []) {
  const enlaces = relacionadas.length
    ? `<nav aria-label="Contenido relacionado">
        <h2>Seguir leyendo</h2>
        <ul>${relacionadas
          .map((r) => `<li><a href="${esc(url(r.ruta))}">${esc(r.texto)}</a></li>`)
          .join('')}</ul>
      </nav>`
    : '';

  return `${enlaces}
    <footer>
      <p><a href="${url('/')}">Antojate</a> — menú digital con QR y video para restaurantes en Colombia.</p>
    </footer>`;
}

// Migas de pan. Se imprimen visibles Y como BreadcrumbList: Google pide que el
// dato estructurado se corresponda con algo que esté en la página.
function migas(camino) {
  return `<nav aria-label="Migas de pan"><ol>${camino
    .map(
      (m, i) =>
        `<li>${
          i === camino.length - 1 ? esc(m.nombre) : `<a href="${esc(url(m.ruta))}">${esc(m.nombre)}</a>`
        }</li>`
    )
    .join('')}</ol></nav>`;
}

function schemaMigas(camino) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: camino.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nombre,
      item: url(m.ruta),
    })),
  };
}

// La organización se referencia por @id desde todas las páginas en vez de
// repetirla: así los buscadores entienden que es la MISMA entidad en todo el
// sitio, que es de lo que va construir una entidad reconocible.
const ID_ORGANIZACION = `${SITIO}/#organizacion`;
const ID_SITIO = `${SITIO}/#sitio`;

function schemaFaq(faq) {
  if (!faq || !faq.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map(({ pregunta, respuesta }) => ({
      '@type': 'Question',
      name: pregunta,
      acceptedAnswer: { '@type': 'Answer', text: respuesta },
    })),
  };
}

module.exports = {
  SITIO,
  ID_ORGANIZACION,
  ID_SITIO,
  esc,
  jsonSeguro,
  recortar,
  dinero,
  url,
  cabeceras,
  ensamblar,
  navegacion,
  pie,
  migas,
  schemaMigas,
  schemaFaq,
};
