import test from 'node:test';
import assert from 'node:assert';

import { PAGINAS, buscarPorSlug, listarPorColeccion } from '../../src/features/contenido/contenido/paginas.js';
import { esc, pagina, cabeceras } from '../../seo/comun.js';
import { entidadesBase, grafo, faq, paginaDeContenido, migas } from '../../seo/esquemas.js';
import { cuerpoLanding, cuerpoPagina, cuerpoGuias } from '../../seo/contenido-html.js';

// Estas pruebas cubren lo que un error de SEO tiene de traicionero: no rompe
// nada. Una descripción duplicada, un título de 90 caracteres o un enlace
// interno a un slug que ya no existe se despliegan igual de bien que si
// estuvieran bien, y solo se notan semanas después mirando Search Console.

const SITIO = 'https://bitemo.co';

// Longitudes que caben en un resultado de Google sin quedar cortadas a mitad de
// frase. No son reglas de posicionamiento: son de que el resultado se lea.
const MAX_TITULO = 65;
const MIN_DESCRIPCION = 70;
const MAX_DESCRIPCION = 165;

// ------------------------------------------------------------- el contenido ---

test('cada página tiene slug y ruta únicos', () => {
  const slugs = PAGINAS.map((p) => p.slug);
  const rutas = PAGINAS.map((p) => p.ruta);
  assert.strictEqual(new Set(slugs).size, slugs.length, 'hay slugs repetidos');
  assert.strictEqual(new Set(rutas).size, rutas.length, 'hay rutas repetidas');
});

test('la ruta de una guía cuelga de /guias y la de producto de la raíz', () => {
  for (const p of PAGINAS) {
    const esperado = p.coleccion === 'guia' ? `/guias/${p.slug}` : `/${p.slug}`;
    assert.strictEqual(p.ruta, esperado, `${p.slug} tiene una ruta que no corresponde a su colección`);
  }
});

test('ningún título ni descripción se repite entre páginas', () => {
  const titulos = PAGINAS.map((p) => p.titulo);
  const descripciones = PAGINAS.map((p) => p.descripcion);
  assert.strictEqual(new Set(titulos).size, titulos.length, 'dos páginas comparten <title>');
  assert.strictEqual(
    new Set(descripciones).size,
    descripciones.length,
    'dos páginas comparten meta description: eso es contenido duplicado'
  );
});

test('los títulos y descripciones caben en un resultado de búsqueda', () => {
  for (const p of PAGINAS) {
    assert.ok(p.titulo.length <= MAX_TITULO, `«${p.titulo}» mide ${p.titulo.length} (máximo ${MAX_TITULO})`);
    assert.ok(
      p.descripcion.length >= MIN_DESCRIPCION && p.descripcion.length <= MAX_DESCRIPCION,
      `la descripción de ${p.slug} mide ${p.descripcion.length}, fuera de ${MIN_DESCRIPCION}–${MAX_DESCRIPCION}`
    );
  }
});

test('toda página tiene H1, entradilla, secciones con contenido y fecha', () => {
  for (const p of PAGINAS) {
    assert.ok(p.h1?.length > 10, `${p.slug} no tiene H1`);
    assert.ok(p.entradilla?.length > 80, `${p.slug} tiene una entradilla demasiado corta`);
    assert.ok(p.secciones?.length >= 3, `${p.slug} tiene menos de tres secciones: es contenido pobre`);
    assert.match(p.actualizado, /^\d{4}-\d{2}-\d{2}$/, `${p.slug} no tiene fecha de actualización válida`);

    for (const s of p.secciones) {
      assert.ok(s.h2?.length > 5, `${p.slug} tiene una sección sin H2`);
      assert.ok(
        s.parrafos?.length || s.lista?.length || s.pasos?.length || s.comparativa,
        `la sección «${s.h2}» de ${p.slug} está vacía`
      );
    }
  }
});

test('los enlaces internos apuntan a páginas que existen', () => {
  for (const p of PAGINAS) {
    for (const slug of p.relacionadas || []) {
      assert.ok(buscarPorSlug(slug), `${p.slug} enlaza a «${slug}», que no existe`);
      assert.notStrictEqual(slug, p.slug, `${p.slug} se enlaza a sí misma`);
    }
    assert.ok((p.relacionadas || []).length >= 2, `${p.slug} enlaza a menos de dos páginas: queda casi huérfana`);
  }
});

test('cada página responde al menos dos preguntas concretas', () => {
  // El FAQ no es decoración: es el formato que mejor extrae un asistente cuando
  // alguien le hace justo esa pregunta.
  for (const p of PAGINAS) {
    assert.ok(p.faq?.length >= 2, `${p.slug} tiene menos de dos preguntas frecuentes`);
    for (const f of p.faq) {
      assert.ok(f.pregunta.trim().endsWith('?'), `«${f.pregunta}» (${p.slug}) no es una pregunta`);
      assert.ok(f.respuesta.length > 80, `la respuesta a «${f.pregunta}» es demasiado corta para servir de nada`);
    }
  }
});

// ------------------------------------------------------------------- el HTML ---

test('el escapado corta cualquier intento de inyectar HTML', () => {
  assert.strictEqual(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.strictEqual(esc("a & b '"), 'a &amp; b &#39;');
});

test('el JSON-LD escapa el < para que no se pueda cerrar el <script>', () => {
  const html = cabeceras({
    sitio: SITIO,
    titulo: 't',
    descripcion: 'd',
    canonical: SITIO,
    jsonLd: { texto: '</script><script>alert(1)</script>' },
  });
  assert.ok(!html.includes('</script><script>'), 'el JSON-LD deja cerrar la etiqueta: es una inyección');
  assert.ok(html.includes('\\u003c/script'));
});

test('una página sin canonical no lo declara, y con robots sí', () => {
  const con = cabeceras({ sitio: SITIO, titulo: 't', descripcion: 'd', canonical: `${SITIO}/x`, jsonLd: {} });
  const sin = cabeceras({ sitio: SITIO, titulo: 't', descripcion: 'd', canonical: null, robots: 'noindex', jsonLd: {} });
  assert.match(con, /rel="canonical"/);
  assert.doesNotMatch(sin, /rel="canonical"/);
  assert.match(sin, /name="robots" content="noindex"/);
});

test('ensamblar una página quita las etiquetas de la portada y no deja duplicados', () => {
  const plantilla = `<!doctype html><html><head><title>Portada</title>
    <meta name="description" content="de la portada" />
    <link rel="canonical" href="${SITIO}/" />
    <meta property="og:title" content="portada" />
    <script type="application/ld+json">{"a":1}</script>
    </head><body><div id="root"></div></body></html>`;

  const html = pagina(plantilla, {
    sitio: SITIO,
    titulo: 'Otra',
    descripcion: 'otra descripción',
    canonical: `${SITIO}/otra`,
    jsonLd: { b: 2 },
    cuerpo: '<h1>Otra</h1>',
  });

  assert.strictEqual(html.match(/<title>/g).length, 1, 'quedaron dos <title>');
  assert.strictEqual(html.match(/rel="canonical"/g).length, 1, 'quedaron dos canonical');
  assert.strictEqual(html.match(/application\/ld\+json/g).length, 1, 'quedaron dos bloques JSON-LD');
  assert.ok(!html.includes('Portada'), 'sobrevivió el título de la portada');
  assert.ok(html.includes('<h1>Otra</h1>'));
});

test('el cascarón sin cuerpo deja el #root vacío', () => {
  const plantilla = '<html><head></head><body><div id="root"></div></body></html>';
  const html = pagina(plantilla, { sitio: SITIO, titulo: 't', descripcion: 'd', canonical: null, jsonLd: {}, cuerpo: '' });
  assert.ok(html.includes('<div id="root"></div>'), 'el cascarón tiene que quedarse vacío para que React lo llene');
});

test('el HTML de cada página lleva su H1, sus H2 y enlaces reales', () => {
  for (const p of PAGINAS) {
    const relacionadas = p.relacionadas.map(buscarPorSlug).map((r) => ({ ruta: r.ruta, texto: r.h1 }));
    const html = cuerpoPagina(SITIO, p, relacionadas);

    assert.strictEqual(html.match(/<h1>/g).length, 1, `${p.slug} no tiene exactamente un H1`);
    assert.ok(html.includes(`<h1>${esc(p.h1)}</h1>`), `el H1 de ${p.slug} no coincide con el dato`);
    for (const s of p.secciones) assert.ok(html.includes(esc(s.h2)), `falta el H2 «${s.h2}» en ${p.slug}`);
    for (const r of relacionadas) assert.ok(html.includes(`${SITIO}${r.ruta}`), `falta el enlace a ${r.ruta}`);
    assert.ok(html.includes('<dl>'), `${p.slug} no pinta su FAQ`);
  }
});

test('la portada escrita por el build lleva el H1 y enlaza al contenido', () => {
  const html = cuerpoLanding(SITIO);
  assert.strictEqual(html.match(/<h1>/g).length, 1);
  for (const ruta of ['/menu-digital-con-video', '/menu-qr-para-restaurantes', '/restaurantes', '/guias']) {
    assert.ok(html.includes(`${SITIO}${ruta}`), `la portada no enlaza a ${ruta}: nace huérfana`);
  }
});

test('el índice de guías enlaza a todas las guías', () => {
  const guias = listarPorColeccion('guia');
  const html = cuerpoGuias(SITIO, guias);
  for (const g of guias) assert.ok(html.includes(`${SITIO}${g.ruta}`), `el índice no enlaza a ${g.slug}`);
});

test('el contenido de un restaurante malicioso no puede inyectar HTML', () => {
  // Las páginas de contenido las escribimos nosotros, pero el generador es el
  // mismo que usa la vitrina para texto que escribe un restaurante.
  const veneno = { h2: '<img src=x onerror=alert(1)>', parrafos: ['</p><script>alert(1)</script>'] };
  const html = cuerpoPagina(SITIO, { ...PAGINAS[0], secciones: [veneno] }, []);

  // Lo que importa no es que la cadena "onerror" desaparezca —sigue ahí, y debe
  // seguir, como texto visible— sino que no queden los signos que la convierten
  // en una etiqueta. Escapados, `<img` y `<script>` son palabras, no código.
  assert.ok(!html.includes('<script>'), 'se coló un <script>');
  assert.ok(!html.includes('<img'), 'se coló una etiqueta <img>');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'el texto debe conservarse, pero escapado');
  assert.ok(html.includes('&lt;/p&gt;&lt;script&gt;'), 'el intento de cerrar el párrafo tiene que quedar escapado');
});

// --------------------------------------------------------- datos estructurados ---

test('las entidades base se declaran una vez y con @id estable', () => {
  const nodos = entidadesBase(SITIO);
  const tipos = nodos.map((n) => n['@type']);
  assert.deepStrictEqual(tipos, ['Organization', 'WebSite', 'SoftwareApplication']);
  for (const n of nodos) assert.ok(n['@id']?.startsWith(SITIO), 'una entidad base no tiene @id propio');
});

test('el SoftwareApplication no declara precios', () => {
  // Los precios viven en la base de datos. Escribirlos en un archivo estático
  // los deja desactualizados en el primer cambio de plan.
  const app = entidadesBase(SITIO).find((n) => n['@type'] === 'SoftwareApplication');
  assert.ok(!app.offers, 'hay precios escritos a mano en el JSON-LD');
  assert.ok(app.featureList.length >= 5, 'la lista de funciones es la que lee un asistente; no puede quedarse corta');
});

test('una guía es Article y una página de producto es WebPage', () => {
  for (const p of PAGINAS) {
    const nodo = paginaDeContenido(SITIO, p);
    assert.strictEqual(nodo['@type'], p.coleccion === 'guia' ? 'Article' : 'WebPage');
    assert.strictEqual(nodo.url, `${SITIO}${p.ruta}`);
    assert.strictEqual(nodo.dateModified, p.actualizado);
  }
});

test('el FAQPage sale de las mismas preguntas que se pintan', () => {
  const p = PAGINAS[0];
  const nodo = faq(p.faq);
  assert.strictEqual(nodo.mainEntity.length, p.faq.length);
  assert.strictEqual(nodo.mainEntity[0].name, p.faq[0].pregunta);
  assert.strictEqual(faq([]), null, 'sin preguntas no debe declararse un FAQPage vacío');
});

test('las migas numeran desde 1 y terminan en la propia página', () => {
  const camino = [
    { nombre: 'Bitemo', ruta: '/' },
    { nombre: 'Guías', ruta: '/guias' },
    { nombre: 'X', ruta: '/guias/x' },
  ];
  const nodo = migas(SITIO, camino);
  assert.deepStrictEqual(
    nodo.itemListElement.map((i) => i.position),
    [1, 2, 3]
  );
  assert.strictEqual(nodo.itemListElement.at(-1).item, `${SITIO}/guias/x`);
});

test('el grafo descarta los nodos vacíos', () => {
  assert.strictEqual(grafo([{ a: 1 }, null, undefined])['@graph'].length, 1);
});
