// Piezas compartidas por todo lo que el BUILD escribe en HTML.
//
// Vive fuera de src/ a propósito: esto corre en Node durante `vite build` y no
// debe acabar dentro del paquete que descarga el navegador. Solo importa datos
// de src/ (los textos), nunca componentes.
//
// Sí, `esc` y `url` también existen en backend/src/services/seo/html.js. No se
// comparten porque son runtimes distintos —CommonJS en un contenedor, ESM en
// otro— y son seis líneas: acoplar los dos despliegues para ahorrarlas sería
// peor negocio que copiarlas.

export const esc = (valor) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// JSON.stringify NO escapa '<': un '</script>' dentro de un texto cerraría la
// etiqueta antes de tiempo y el resto del JSON se interpretaría como HTML.
export const jsonSeguro = (obj) => JSON.stringify(obj).replaceAll('<', '\\u003c');

export const crearUrl = (sitio) => (ruta = '/') =>
  `${sitio}${ruta === '/' ? '/' : ruta.startsWith('/') ? ruta : `/${ruta}`}`;

/**
 * Etiquetas del <head>. Se generan juntas para que no pueda quedar un og:title
 * sin su og:url: las vistas previas al compartir fallan de formas difíciles de
 * diagnosticar cuando el juego está incompleto.
 */
export function cabeceras({ sitio, titulo, descripcion, canonical, imagen, tipoOg = 'website', jsonLd, robots }) {
  const url = crearUrl(sitio);
  const img = imagen || url('/marca/og.png');

  return [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}" />`,
    // Sin canonical cuando no hay una URL propia que reclamar: el cascarón de la
    // SPA y la página de error no son direcciones que nadie deba indexar, y
    // apuntarlas a la portada sería declarar que SON la portada.
    canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : '',
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
    `<script type="application/ld+json">${jsonSeguro(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

// El index.html del build trae el juego de etiquetas de la portada. Cualquier
// otra página tiene que QUITARLAS antes de poner las suyas: dos <title> o dos
// canonical dejan que el buscador elija, y elegiría el genérico.
export function limpiarCabecera(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/<meta\s+name="robots"[\s\S]*?\/>/, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/, '')
    .replace(/<meta\s+property="og:[\s\S]*?\/>/g, '')
    .replace(/<meta\s+name="twitter:[\s\S]*?\/>/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
}

/**
 * Escribe una página completa a partir de la plantilla del build.
 *
 * El contenido va DENTRO de <div id="root">. React lo reemplaza al montar: es la
 * misma página escrita en HTML plano para quien no ejecuta JavaScript. No es
 * encubrimiento porque dice exactamente lo mismo — sale de los mismos textos que
 * pinta React.
 *
 * Las dos clases del envoltorio son solo tipografía (ver index.css). El HTML de
 * dentro no lleva ninguna, para que se entienda sin CSS; pero este contenido
 * también lo VE el visitante mientras React arranca, y sin ellas ese momento es
 * texto con los estilos por defecto del navegador sobre el fondo oscuro del
 * sitio: negro sobre negro.
 */
export function pagina(plantilla, { cuerpo, ...meta }) {
  const html = limpiarCabecera(plantilla).replace('</head>', `  ${cabeceras(meta)}\n  </head>`);

  // Sin cuerpo, el #root se queda vacío: es el caso del cascarón de la SPA, que
  // solo necesita la cabecera.
  if (!cuerpo) return html;

  return html.replace(
    '<div id="root"></div>',
    `<div id="root"><div class="contenido-previo superficie-plataforma">${cuerpo}</div></div>`
  );
}
