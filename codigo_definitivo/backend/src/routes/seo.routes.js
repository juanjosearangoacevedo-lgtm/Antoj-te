const fs = require('fs');
const path = require('path');
const router = require('express').Router();

const asyncHandler = require('../middlewares/asyncHandler');
const seo = require('../services/seo.service');

// Rutas que devuelven HTML/XML/texto, NO JSON. Van montadas en la raíz y fuera de
// /api porque las pide un buscador escribiendo la dirección, no el frontend.
//
// En producción Nginx sirve el resto del sitio y solo reenvía estas aquí
// (ver frontend/nginx.conf). Lo que llega aquí es lo que DEPENDE DE LA BASE DE
// DATOS; las páginas de contenido las escribe el build del frontend en HTML
// estático y las sirve Nginx sin pasar por Node.

// Archivos del frontend YA construido. Se piden una vez y se guardan: son los
// mismos para todos y no cambian hasta el próximo despliegue, momento en el que
// este proceso se reinicia igualmente.
//
// De dónde salen, según dónde corra:
//
//   · En PRODUCCIÓN, del contenedor `web` por HTTP. El backend y el frontend son
//     imágenes separadas (ver docker-compose.yml): el Dockerfile del backend hace
//     `COPY . .` sobre su propia carpeta, así que dentro de ese contenedor NO
//     existe ningún frontend/dist. Leerlo de disco allí sería un ENOENT y /r/
//     respondería 500 en el servidor aunque en local funcionara perfecto.
//
//   · En DESARROLLO, de disco, porque no hay ningún Nginx delante.
//
// FRONTEND_DIST fuerza el disco y FRONTEND_ORIGIN el HTTP, por si algún día el
// montaje cambia.
const DIR_DIST = process.env.FRONTEND_DIST || path.resolve(__dirname, '../../../frontend/dist');
const ORIGEN_WEB = process.env.FRONTEND_ORIGIN || (process.env.NODE_ENV === 'production' ? 'http://web' : null);

const cacheArchivos = new Map();

/**
 * Lee un archivo del frontend construido.
 *
 * Por HTTP va a `/_interno/<archivo>` y no a `/<archivo>`: la ruta normal la
 * atiende el servidor de puerto 80, que redirige TODO a https://bitemo.co, y
 * seguir ese redirect obligaría al contenedor a salir a Internet y volver por
 * Cloudflare para leer un archivo que tiene al lado. `redirect: 'error'` está
 * para que, si esa `location` interna desapareciera, falle ruidosamente en vez
 * de traerse una página equivocada.
 */
async function archivoDelBuild(nombre) {
  if (cacheArchivos.has(nombre)) return cacheArchivos.get(nombre);

  let contenido;
  if (ORIGEN_WEB) {
    const res = await fetch(`${ORIGEN_WEB}/_interno/${nombre}`, { redirect: 'error' });
    if (!res.ok) throw new Error(`No se pudo leer ${nombre} de ${ORIGEN_WEB}: HTTP ${res.status}`);
    contenido = await res.text();
  } else {
    contenido = fs.readFileSync(path.join(DIR_DIST, nombre), 'utf8');
  }

  cacheArchivos.set(nombre, contenido);
  return contenido;
}

/**
 * El cascarón de la SPA: index.html SIN contenido dentro de #root.
 *
 * Se pide app.html y no index.html porque desde que la portada se entrega ya
 * escrita, su #root viene lleno y el hueco donde va la carta ya no existiría.
 * El respaldo a index.html cubre el momento del despliegue en el que el
 * contenedor web todavía sea la versión anterior, que no tiene app.html.
 */
async function plantilla() {
  try {
    return await archivoDelBuild('app.html');
  } catch {
    return archivoDelBuild('index.html');
  }
}

/** Índice de páginas que escribe el build; alimenta /llms.txt. */
async function paginasDelBuild() {
  try {
    return JSON.parse(await archivoDelBuild('paginas.json')).paginas || [];
  } catch {
    // Que no haya índice no puede tumbar llms.txt: sale sin la sección de guías.
    return [];
  }
}

// Caché de páginas ya armadas. Una carta cambia unas pocas veces al día y un
// rastreador puede pedir la misma URL muchas veces seguidas; sin esto, cada
// petición serían dos consultas y volver a montar todo el HTML.
const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function limpiarCacheSeo() {
  cache.clear();
}

/**
 * Sirve una página armada, con caché por clave y un 404 que no se rompe.
 *
 * Un slug que no existe no puede tumbar la página: se devuelve el cascarón sin
 * tocar, con estado 404, y React enseña su propia pantalla de "no encontrado".
 * Sin esto, un enlace viejo compartido en redes daría un error crudo.
 */
const servirHtml = (clave, construir) =>
  asyncHandler(async (req, res) => {
    const id = clave(req);
    const hit = cache.get(id);
    if (hit && hit.exp > Date.now()) return res.type('html').send(hit.html);

    let html;
    try {
      html = await construir(req, await plantilla());
    } catch (err) {
      if (err.status === 404) return res.status(404).type('html').send(await plantilla());
      throw err;
    }

    cache.set(id, { html, exp: Date.now() + TTL_MS });
    res.type('html').send(html);
  });

// Carta pública de un restaurante.
router.get(
  '/r/:slug',
  servirHtml(
    (req) => `r:${req.params.slug}`,
    async (req, plantillaHtml) => seo.renderizar(plantillaHtml, await seo.datosDeVitrina(req.params.slug))
  )
);

// Directorio. Va antes que la ruta de ciudad para que /restaurantes no se lea
// como una ciudad llamada "".
router.get(
  '/restaurantes',
  servirHtml(
    () => 'directorio',
    (req, plantillaHtml) => seo.directorioIndice(plantillaHtml)
  )
);

router.get(
  '/restaurantes/:ciudad',
  servirHtml(
    (req) => `ciudad:${req.params.ciudad}`,
    (req, plantillaHtml) => seo.directorioCiudad(plantillaHtml, req.params.ciudad)
  )
);

// Sitemap de lo que sale de la base. El índice /sitemap.xml y el de páginas los
// escribe el build del frontend y los sirve Nginx.
router.get(
  '/sitemap-restaurantes.xml',
  asyncHandler(async (req, res) => {
    res.type('application/xml').send(await seo.sitemapRestaurantes());
  })
);

router.get(
  '/llms.txt',
  asyncHandler(async (req, res) => {
    res.type('text/plain; charset=utf-8').send(await seo.llmsTxt(await paginasDelBuild()));
  })
);

module.exports = router;
module.exports.limpiarCacheSeo = limpiarCacheSeo;
