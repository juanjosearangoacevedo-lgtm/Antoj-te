// Fachada del motor SEO.
//
// Lo que antes era un solo archivo de 300 líneas para /r/:slug creció a cuatro
// páginas distintas (vitrina, directorio, ciudad, sitemap, llms.txt) y habría
// pasado de las 900. Se partió por página dentro de services/seo/, y esto
// reexporta la superficie pública para que quien la use no tenga que saber en
// cuál de los cuatro archivos vive cada cosa.
//
//   seo/html.js       escapado, cabeceras y ensamblado sobre el index.html
//   seo/vitrina.js    /r/:slug — la carta de un restaurante
//   seo/directorio.js /restaurantes y /restaurantes/:ciudad
//   seo/indice.js     sitemap de restaurantes y llms.txt
//
// Las páginas de contenido (portada, guías, páginas de producto) NO están aquí:
// las escribe el build del frontend como HTML estático, porque no dependen de la
// base de datos y así las sirve Nginx directamente. Ver frontend/vite.config.js.

const html = require('./seo/html');
const vitrina = require('./seo/vitrina');
const directorio = require('./seo/directorio');
const indice = require('./seo/indice');

module.exports = {
  SITIO: html.SITIO,

  // Vitrina de restaurante
  datosDeVitrina: vitrina.datosDeVitrina,
  renderizar: vitrina.renderizar,
  metadatos: vitrina.metadatos,
  datosEstructurados: vitrina.datosEstructurados,

  // Directorio
  directorioIndice: directorio.indice,
  directorioCiudad: directorio.porCiudad,

  // Índices para buscadores
  sitemapRestaurantes: indice.sitemapRestaurantes,
  llmsTxt: indice.llmsTxt,
};
