// Escribe en HTML plano las páginas que hoy solo existen como React.
//
// Este HTML va dentro de <div id="root"> y React lo reemplaza al montar. Es la
// misma página, escrita para quien no ejecuta JavaScript: los rastreadores de
// ChatGPT Search, Perplexity o Claude leen el HTML tal cual llega, y Google lo
// indexa sin esperar a renderizar.
//
// Sale de los MISMOS textos que pinta React (contenido/landing.js y
// contenido/paginas.js), así que no puede decir algo distinto de lo que se ve.
// Esa es la línea entre esto y el encubrimiento, y es la que no se cruza.

import { esc, crearUrl } from './comun.js';
import { PREGUNTAS } from '../src/features/landing/contenido/preguntas.js';
import {
  HERO,
  COMO_FUNCIONA,
  BENEFICIOS,
  PRECIOS,
  PREGUNTAS as COPIA_PREGUNTAS,
  CTA_FINAL,
  ENLACES_CONTENIDO,
} from '../src/features/landing/contenido/landing.js';

// --- Piezas ---

const parrafos = (textos = []) => textos.map((t) => `<p>${esc(t)}</p>`).join('');

const lista = (items = []) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

// Los pasos van en <ol>: el orden es parte de la información, y un buscador que
// lee <ul> no sabe que el paso 2 va después del 1.
const pasos = (items = []) =>
  items.length
    ? `<ol>${items
        .map((p) => `<li><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`)
        .join('')}</ol>`
    : '';

// Tabla comparativa real, con <th scope>. Una comparación en <div> es invisible
// como comparación; en <table> se entiende que la fila enfrenta dos opciones.
const comparativa = (c) =>
  c
    ? `<table>
        <thead><tr><th scope="col"></th>${c.columnas
          .map((col) => `<th scope="col">${esc(col)}</th>`)
          .join('')}</tr></thead>
        <tbody>${c.filas
          .map(
            (f) => `<tr><th scope="row">${esc(f.aspecto)}</th><td>${esc(f.a)}</td><td>${esc(f.b)}</td></tr>`
          )
          .join('')}</tbody>
      </table>`
    : '';

const seccion = (s) =>
  `<section><h2>${esc(s.h2)}</h2>${parrafos(s.parrafos)}${lista(s.lista)}${pasos(s.pasos)}${comparativa(
    s.comparativa
  )}</section>`;

// El FAQ se escribe como <dl>: pregunta y respuesta quedan emparejadas en el
// propio HTML, no solo en el JSON-LD. Es lo que hace que la respuesta se pueda
// extraer aunque el rastreador ignore los datos estructurados.
const faqHtml = (preguntas = [], titulo = 'Preguntas frecuentes') =>
  preguntas.length
    ? `<section><h2>${esc(titulo)}</h2><dl>${preguntas
        .map((p) => `<dt>${esc(p.pregunta)}</dt><dd>${esc(p.respuesta)}</dd>`)
        .join('')}</dl></section>`
    : '';

const enlaces = (url, items) =>
  items.map(({ ruta, texto }) => `<li><a href="${esc(url(ruta))}">${esc(texto)}</a></li>`).join('');

// Navegación y pie. Existen sobre todo por los ENLACES: un rastreador descubre
// /guias y /restaurantes porque hay un <a> apuntándolos desde la portada, no
// porque estén listados en el sitemap.
const navegacion = (url) =>
  `<nav aria-label="Principal"><ul><li><a href="${url('/')}">Bitemo</a></li>${enlaces(
    url,
    ENLACES_CONTENIDO
  )}</ul></nav>`;

const migasHtml = (url, camino) =>
  `<nav aria-label="Migas de pan"><ol>${camino
    .map((m, i) =>
      i === camino.length - 1
        ? `<li>${esc(m.nombre)}</li>`
        : `<li><a href="${esc(url(m.ruta))}">${esc(m.nombre)}</a></li>`
    )
    .join('')}</ol></nav>`;

const pie = (url, relacionadas = []) =>
  `${
    relacionadas.length
      ? `<nav aria-label="Contenido relacionado"><h2>Seguir leyendo</h2><ul>${enlaces(
          url,
          relacionadas
        )}</ul></nav>`
      : ''
  }<footer><p><a href="${url(
    '/'
  )}">Bitemo</a> — menú digital con QR y video para restaurantes en Colombia.</p></footer>`;

// --- Cuerpos ---

/**
 * La portada. Recorre las mismas secciones que la landing de React y en el mismo
 * orden, para que el HTML y la pantalla cuenten lo mismo.
 *
 * Los PRECIOS no llevan cifras: se leen de la base de datos en tiempo de
 * ejecución y esto es un archivo estático. Escribir aquí un número lo dejaría
 * desactualizado en el primer cambio de plan, y un precio equivocado en un
 * buscador es peor que ningún precio. Los vigentes salen en /llms.txt.
 */
export function cuerpoLanding(sitio) {
  const url = crearUrl(sitio);

  return `${navegacion(url)}
    <main>
      <h1>${esc(HERO.h1)}</h1>
      <p>${esc(HERO.entradilla)}</p>
      ${lista(HERO.pilares.map((p) => p.texto))}

      <section>
        <h2>${esc(COMO_FUNCIONA.h2)}</h2>
        <p>${esc(COMO_FUNCIONA.entradilla)}</p>
        ${pasos(COMO_FUNCIONA.pasos)}
      </section>

      <section>
        <h2>${esc(BENEFICIOS.h2)}</h2>
        <p>${esc(BENEFICIOS.entradilla)}</p>
        ${BENEFICIOS.items.map((i) => `<h3>${esc(i.titulo)}</h3><p>${esc(i.texto)}</p>`).join('')}
      </section>

      <section>
        <h2>${esc(PRECIOS.h2)}</h2>
        <p>${esc(PRECIOS.entradilla)}</p>
      </section>

      ${faqHtml(PREGUNTAS, COPIA_PREGUNTAS.h2)}

      <section>
        <h2>${esc(CTA_FINAL.h2)}</h2>
        <p>${esc(CTA_FINAL.texto)}</p>
      </section>
    </main>
    ${pie(url, ENLACES_CONTENIDO)}`;
}

/** Una página de producto o una guía. */
export function cuerpoPagina(sitio, pagina, relacionadas) {
  const url = crearUrl(sitio);
  const camino =
    pagina.coleccion === 'guia'
      ? [{ nombre: 'Bitemo', ruta: '/' }, { nombre: 'Guías', ruta: '/guias' }, { nombre: pagina.h1, ruta: pagina.ruta }]
      : [{ nombre: 'Bitemo', ruta: '/' }, { nombre: pagina.h1, ruta: pagina.ruta }];

  return `${navegacion(url)}
    ${migasHtml(url, camino)}
    <main>
      <article>
        <h1>${esc(pagina.h1)}</h1>
        <p>${esc(pagina.entradilla)}</p>
        ${pagina.secciones.map(seccion).join('')}
        ${faqHtml(pagina.faq)}
        <p>Actualizado el ${esc(pagina.actualizado)}.</p>
      </article>
    </main>
    ${pie(url, relacionadas)}`;
}

/** El índice de guías. */
export function cuerpoGuias(sitio, guias) {
  const url = crearUrl(sitio);

  return `${navegacion(url)}
    ${migasHtml(url, [
      { nombre: 'Bitemo', ruta: '/' },
      { nombre: 'Guías', ruta: '/guias' },
    ])}
    <main>
      <h1>Guías para restaurantes</h1>
      <p>Cómo montar y aprovechar un menú digital, explicado sin vender nada: qué formatos existen, cómo se crea la carta, cómo se graban los platos y qué cambia frente a la carta impresa.</p>
      <ul>${guias
        .map(
          (g) =>
            `<li><h2><a href="${esc(url(g.ruta))}">${esc(g.h1)}</a></h2><p>${esc(g.descripcion)}</p></li>`
        )
        .join('')}</ul>
    </main>
    ${pie(url, [
      { ruta: '/menu-digital-con-video', texto: 'Menú digital con video' },
      { ruta: '/menu-qr-para-restaurantes', texto: 'Menú QR para restaurantes' },
    ])}`;
}
