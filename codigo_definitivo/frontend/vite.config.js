import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { PREGUNTAS } from './src/features/landing/contenido/preguntas.js';
import { PAGINAS, REVISADO, listarPorColeccion, buscarPorSlug } from './src/features/contenido/contenido/paginas.js';
import { pagina as escribirPagina, crearUrl } from './seo/comun.js';
import { entidadesBase, migas, faq, paginaDeContenido, grafo, idSitio, idOrganizacion } from './seo/esquemas.js';
import { cuerpoLanding, cuerpoPagina, cuerpoGuias } from './seo/contenido-html.js';

// Dominio público del sitio. Vive SOLO aquí: index.html lo recibe sustituyendo
// el token __SITIO__ y robots.txt/sitemap se generan a partir de él. Para
// cambiarlo al desplegar basta con VITE_SITIO_URL (el Dockerfile ya lo pasa).
// El dominio real es .co (comprado el 2026-08-05). El .com está tomado y, además,
// el .co le da a Google señal geográfica de Colombia, que es el mercado objetivo.
const SITIO_POR_DEFECTO = 'https://bitemo.co';

// Rutas privadas o con sesión: no aportan nada en buscadores y /menu ni
// siquiera funciona sin su token de mesa.
//
// /r/ NO está aquí a propósito: es la vitrina pública de cada restaurante y una
// de las partes del producto que tiene sentido indexar. El servidor la entrega
// ya escrita en HTML (backend/src/services/seo/vitrina.js).
const RUTAS_PRIVADAS = ['/admin', '/cocina', '/login', '/recuperar', '/restablecer', '/menu'];

// Archivos de servicio que no son páginas. Se excluyen para que no acaben
// indexados como contenido pobre: app.html es el cascarón vacío de la SPA y
// paginas.json es el índice que el backend lee para armar /llms.txt.
const ARCHIVOS_INTERNOS = ['/app.html', '/paginas.json'];

// Rastreadores de los buscadores con IA. Se nombran uno a uno aunque el `*` de
// abajo ya los cubra, por dos razones:
//   · deja por escrito que son bienvenidos, y evita que alguien los bloquee sin
//     darse cuenta al endurecer el robots.txt más adelante;
//   · varios distinguen el bot que ENTRENA modelos del que responde búsquedas, y
//     aquí solo se invitan los de búsqueda: aparecer en las respuestas es el
//     objetivo, alimentar entrenamientos es otra decisión y no se toma de rebote.
const BOTS_IA = [
  'OAI-SearchBot', // ChatGPT Search
  'ChatGPT-User', // ChatGPT al abrir un enlace que le pide el usuario
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended', // respuestas generadas de Google (AI Overviews)
  'Applebot-Extended',
];

// Datos estructurados de la portada. El FAQPage sale del MISMO array que la
// pinta, porque Google marca como error un FAQPage cuyo texto no aparece en la
// página.
const grafoPortada = (sitio) =>
  grafo([
    ...entidadesBase(sitio),
    {
      '@type': 'WebPage',
      '@id': `${sitio}/#portada`,
      url: `${sitio}/`,
      name: 'Menú digital con QR y video para restaurantes',
      description:
        'Bitemo convierte la carta de un restaurante en un menú digital con código QR donde cada plato se ve en video y el comensal pide desde la mesa.',
      inLanguage: 'es',
      isPartOf: { '@id': idSitio(sitio) },
      about: { '@id': idOrganizacion(sitio) },
    },
    faq(PREGUNTAS),
  ]);

// Grafo de una página de contenido: la página, sus migas, su FAQ y las entidades
// permanentes por referencia.
const grafoPagina = (sitio, p) => {
  const camino =
    p.coleccion === 'guia'
      ? [
          { nombre: 'Bitemo', ruta: '/' },
          { nombre: 'Guías', ruta: '/guias' },
          { nombre: p.h1, ruta: p.ruta },
        ]
      : [
          { nombre: 'Bitemo', ruta: '/' },
          { nombre: p.h1, ruta: p.ruta },
        ];

  return grafo([paginaDeContenido(sitio, p), migas(sitio, camino), faq(p.faq)]);
};

// --- XML ---

const urlXml = ({ loc, lastmod, frecuencia = 'monthly', prioridad = '0.7' }) =>
  `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${frecuencia}</changefreq><priority>${prioridad}</priority></url>`;

function sitemapPaginas(sitio) {
  const url = crearUrl(sitio);
  const filas = [
    { loc: url('/'), lastmod: REVISADO, frecuencia: 'weekly', prioridad: '1.0' },
    ...listarPorColeccion('producto').map((p) => ({
      loc: url(p.ruta),
      lastmod: p.actualizado,
      prioridad: '0.9',
    })),
    { loc: url('/guias'), lastmod: REVISADO, prioridad: '0.6' },
    ...listarPorColeccion('guia').map((p) => ({ loc: url(p.ruta), lastmod: p.actualizado, prioridad: '0.7' })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filas.map(urlXml).join('\n')}
</urlset>
`;
}

// Índice de sitemaps. Existe porque hay dos fuentes que no se pueden fusionar:
// las páginas salen del build y los restaurantes de la base de datos. Sin el
// índice habría que duplicar la lista de páginas dentro del backend, y esa copia
// se quedaría atrás en cuanto se publicara una guía nueva.
function sitemapIndice(sitio) {
  const url = crearUrl(sitio);
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${url('/sitemap-paginas.xml')}</loc><lastmod>${REVISADO}</lastmod></sitemap>
  <sitemap><loc>${url('/sitemap-restaurantes.xml')}</loc></sitemap>
</sitemapindex>
`;
}

function robotsTxt(sitio) {
  const url = crearUrl(sitio);
  const reglas = [
    ...RUTAS_PRIVADAS.map((r) => `Disallow: ${r}`),
    ...ARCHIVOS_INTERNOS.map((r) => `Disallow: ${r}`),
    'Allow: /r/',
  ];

  return [
    'User-agent: *',
    ...reglas,
    '',
    '# Buscadores con IA: todas las páginas públicas se sirven ya escritas en',
    '# HTML (no hace falta ejecutar JavaScript) y con datos estructurados de',
    '# Schema.org. La carta de cada restaurante está en /r/<slug>, y en',
    '# /llms.txt hay un resumen del sitio en texto plano.',
    ...BOTS_IA.flatMap((bot) => [`User-agent: ${bot}`, ...reglas, '']),
    `Sitemap: ${url('/sitemap.xml')}`,
    '',
  ].join('\n');
}

// --- El plugin ---

function seoEstatico(sitio) {
  const url = crearUrl(sitio);
  // La plantilla con el #root VACÍO. Se guarda al vuelo desde transformIndexHtml
  // porque es lo único que tiene el HTML final con los <script> del build ya
  // inyectados; a partir de ella se escriben todas las demás páginas.
  let plantilla = null;

  const paginaEstatica = (p) =>
    escribirPagina(plantilla, {
      sitio,
      titulo: p.titulo,
      descripcion: p.descripcion,
      canonical: url(p.ruta),
      tipoOg: p.coleccion === 'guia' ? 'article' : 'website',
      jsonLd: grafoPagina(sitio, p),
      cuerpo: cuerpoPagina(
        sitio,
        p,
        (p.relacionadas || [])
          .map(buscarPorSlug)
          .filter(Boolean)
          .map((r) => ({ ruta: r.ruta, texto: r.h1 }))
      ),
    });

  return {
    name: 'bitemo-seo-estatico',

    transformIndexHtml(html) {
      const base = html
        .replaceAll('__SITIO__', sitio)
        .replace('__JSONLD__', JSON.stringify(grafoPortada(sitio)).replaceAll('<', '\\u003c'));

      // Se guarda ANTES de meterle el cuerpo: las demás páginas necesitan el
      // #root vacío para poner el suyo.
      plantilla = base;

      // Y la portada sí se entrega con su contenido ya escrito dentro de #root.
      return base.replace(
        '<div id="root"></div>',
        `<div id="root"><div class="contenido-previo superficie-plataforma">${cuerpoLanding(sitio)}</div></div>`
      );
    },

    // 'post' para correr DESPUÉS de que Vite haya procesado el index.html: si
    // corriera antes, `plantilla` todavía sería null.
    generateBundle: {
      order: 'post',
      handler() {
        const emitir = (fileName, source) => this.emitFile({ type: 'asset', fileName, source });

        // Cascarón vacío de la SPA. Nginx lo sirve en /menu, /login, /admin y
        // /cocina, que son las rutas que sí existen pero no se indexan. La
        // portada no puede hacer de cascarón desde que lleva su contenido
        // dentro: /login habría parpadeado la landing entera antes de montar.
        //
        // Lleva su propia cabecera y no la de la portada: heredarla dejaba a
        // /login declarando el <title> y el canonical de la página principal.
        // El `noindex` va en el HTML además de en la cabecera HTTP de Nginx
        // porque este archivo es también la plantilla que lee el backend, y así
        // una ruta servida por otro camino tampoco se cuela en el índice. (El
        // backend lo borra antes de escribir cada vitrina; ver seo/html.js.)
        emitir(
          'app.html',
          escribirPagina(plantilla, {
            sitio,
            titulo: 'Bitemo',
            descripcion: 'Menú digital con QR y video para restaurantes.',
            canonical: null,
            robots: 'noindex, nofollow',
            jsonLd: grafo(entidadesBase(sitio)),
            cuerpo: '',
          })
        );

        // Página de "no encontrado". Nginx la devuelve con estado 404 de verdad
        // (ver nginx.conf): antes cualquier URL inventada respondía 200 y
        // redirigía a la portada por JavaScript, que es la definición de soft
        // 404 y ensucia el índice con URLs que no existen.
        emitir(
          '404.html',
          escribirPagina(plantilla, {
            sitio,
            titulo: 'Página no encontrada | Bitemo',
            descripcion:
              'La página que buscas no existe o cambió de dirección. Desde aquí puedes volver a la portada, a las guías o al directorio de restaurantes.',
            // Sin canonical y con noindex: una página de error no es una
            // dirección, y darle la canónica de /404 la convertiría en una
            // página más que indexar.
            canonical: null,
            robots: 'noindex, follow',
            jsonLd: grafo(entidadesBase(sitio)),
            cuerpo: `<main><h1>Esta página no existe</h1>
              <p>Puede que el enlace esté mal escrito o que la página haya cambiado de dirección.</p>
              <ul>
                <li><a href="${url('/')}">Portada de Bitemo</a></li>
                <li><a href="${url('/guias')}">Guías para restaurantes</a></li>
                <li><a href="${url('/restaurantes')}">Restaurantes en Bitemo</a></li>
              </ul></main>`,
          })
        );

        for (const p of PAGINAS) emitir(`${p.ruta.replace(/^\//, '')}.html`, paginaEstatica(p));

        emitir(
          'guias.html',
          escribirPagina(plantilla, {
            sitio,
            titulo: 'Guías de menú digital para restaurantes | Bitemo',
            descripcion:
              'Guías prácticas para montar el menú digital de un restaurante: qué formatos existen, cómo crearlo, cómo grabar los platos y qué cambia frente a la carta impresa.',
            canonical: url('/guias'),
            jsonLd: grafo([
              {
                '@type': 'CollectionPage',
                '@id': `${url('/guias')}#pagina`,
                url: url('/guias'),
                name: 'Guías para restaurantes',
                inLanguage: 'es',
                isPartOf: { '@id': idSitio(sitio) },
                hasPart: listarPorColeccion('guia').map((g) => ({
                  '@type': 'Article',
                  '@id': `${url(g.ruta)}#pagina`,
                  headline: g.h1,
                  url: url(g.ruta),
                })),
              },
              migas(sitio, [
                { nombre: 'Bitemo', ruta: '/' },
                { nombre: 'Guías', ruta: '/guias' },
              ]),
            ]),
            cuerpo: cuerpoGuias(sitio, listarPorColeccion('guia')),
          })
        );

        emitir('robots.txt', robotsTxt(sitio));
        emitir('sitemap.xml', sitemapIndice(sitio));
        emitir('sitemap-paginas.xml', sitemapPaginas(sitio));

        // Índice legible por el backend, que arma /llms.txt mezclando esto con
        // los restaurantes y los planes de la base. Se lo pide al contenedor web
        // por la ruta interna de Nginx, igual que hace con app.html.
        emitir(
          'paginas.json',
          JSON.stringify(
            {
              actualizado: REVISADO,
              paginas: PAGINAS.map(({ slug, ruta, coleccion, h1, descripcion, actualizado }) => ({
                slug,
                ruta,
                coleccion,
                titulo: h1,
                descripcion,
                actualizado,
              })),
            },
            null,
            2
          )
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), seoEstatico(loadEnv(mode, process.cwd(), '').VITE_SITIO_URL || SITIO_POR_DEFECTO)],
  resolve: {
    // '@' apunta siempre a src/. Así un import no depende de cuántos niveles
    // de carpeta tenga el archivo que lo escribe, y mover un archivo no rompe
    // a sus vecinos.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 5173 por defecto; PORT permite levantar una segunda instancia sin chocar.
    port: Number(process.env.PORT) || 5173,
  },
}));
