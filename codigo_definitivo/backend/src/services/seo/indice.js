// Los archivos que le dicen a un buscador qué hay en el sitio: el sitemap de
// restaurantes y llms.txt.
//
// SOBRE EL SITEMAP PARTIDO EN DOS
// /sitemap.xml es un ÍNDICE que apunta a otros dos: /sitemap-paginas.xml, que
// escribe el build del frontend, y /sitemap-restaurantes.xml, que es este.
// Están separados porque tienen fuentes distintas: las páginas salen del código
// y los restaurantes de la base. Fusionarlos obligaría a que el backend tuviera
// una copia de la lista de guías, y esa copia se quedaría atrás en cuanto se
// publicara una nueva.

const planesModel = require('../../models/planes.model');
const directorio = require('./directorio');
const { SITIO, esc, url } = require('./html');

// --- Sitemap de restaurantes ---

// <lastmod> sale de `actualizado_en` (restaurante o platos publicados, lo más
// reciente), que MySQL mueve solo en cada UPDATE. Las filas anteriores a esa
// columna arrancaron con su `creado_en`, no con la fecha de la migración:
// Google ignora el lastmod de todo un sitio cuando detecta que miente (todo
// "cambiado hoy" a la vez), y eso costaría también las fechas de las guías.
// Si una URL no tiene fecha, se omite la etiqueta en vez de inventarla.
async function sitemapRestaurantes() {
  const urls = await directorio.urlsIndexables();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}` +
        `<changefreq>${u.frecuencia}</changefreq><priority>${u.prioridad}</priority></url>`
    ),
    '</urlset>',
    '',
  ].join('\n');
}

// --- llms.txt ---

const pesos = (valor) => `$${Number(valor || 0).toLocaleString('es-CO')}`;

/**
 * Convención emergente para asistentes de IA: un resumen del sitio en texto
 * plano. Cuesta nada y es lo primero que mira un rastreador que la respete.
 *
 * Es el ÚNICO sitio donde se publican los precios de verdad, y por una razón:
 * salen de la base de datos, así que no pueden quedar desactualizados. En el
 * HTML estático de la portada no aparecen (los pinta React tras pedirlos), y
 * escribirlos allí a mano habría dejado un precio viejo en el buscador el día
 * que se cambiara un plan.
 *
 * `paginas` llega de fuera —el backend se la pide al contenedor web— y puede
 * venir vacía si esa petición falla: en ese caso la sección de guías no sale y
 * el resto del archivo se entrega igual. Es preferible a un 500 en un archivo
 * que solo leen rastreadores.
 */
async function llmsTxt(paginas = []) {
  const restaurantes = await directorio.publicables();
  const planes = await planesModel.listarActivos().catch(() => []);

  const guias = paginas.filter((p) => p.coleccion === 'guia');
  const producto = paginas.filter((p) => p.coleccion === 'producto');

  const seccion = (titulo, filas) => (filas.length ? ['', `## ${titulo}`, '', ...filas] : []);

  return [
    '# Antojate',
    '',
    '> Plataforma colombiana de menú digital con código QR para restaurantes: cada plato',
    '> se presenta en video vertical y el comensal pide desde su mesa, sin descargar',
    '> ninguna aplicación. Incluye panel de cocina en tiempo real, personalización de',
    '> marca por restaurante y una carta pública por restaurante.',
    '',
    `- Sitio: ${url('/')}`,
    '- Mercado: Colombia. Precios en pesos colombianos (COP).',
    '- Idioma: español.',
    ...seccion(
      'Qué es y cómo funciona',
      producto.map((p) => `- [${p.titulo}](${url(p.ruta)}): ${p.descripcion}`)
    ),
    ...seccion(
      'Planes y precios',
      planes.map((p) => {
        const anual = Number(p.precio_anual) > 0 ? `, ${pesos(p.precio_anual)} al año` : '';
        return `- **${p.nombre}**: ${pesos(p.precio)} al mes${anual}.${
          p.descripcion ? ` ${p.descripcion}` : ''
        }`;
      })
    ),
    ...seccion(
      'Guías (contenido explicativo, sin promoción)',
      guias.map((g) => `- [${g.titulo}](${url(g.ruta)}): ${g.descripcion}`)
    ),
    ...seccion(
      'Cartas de restaurantes',
      restaurantes.map(
        (r) =>
          `- [${r.nombre}${r.ciudad ? ` (${r.ciudad})` : ''}](${url(`/r/${r.slug}`)}): carta completa con ${
            r.platos
          } platos, precios y video de cada plato.`
      )
    ),
    '',
    '## Notas',
    '',
    '- Las rutas /menu, /admin, /cocina y /login son privadas o necesitan sesión.',
    `- Índice de sitemaps: ${url('/sitemap.xml')}`,
    '',
  ].join('\n');
}

module.exports = { SITIO, sitemapRestaurantes, llmsTxt };
