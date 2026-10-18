// Datos estructurados (Schema.org) de las páginas que escribe el build.
//
// CRITERIO: cada esquema describe algo que está EN la página. Un FAQPage cuyas
// preguntas no se ven es un error en Search Console, y un HowTo inventado no
// mejora nada. Por eso aquí no hay más tipos de los que hay contenido.
//
// Las entidades se declaran UNA vez y se referencian por @id desde el resto de
// páginas. Esa es la diferencia entre que un buscador vea "una web que habla de
// menús" y que reconozca a Antojate como una entidad concreta con un sitio, un
// producto y unos contenidos colgando de ella.

import { crearUrl } from './comun.js';

export const idOrganizacion = (sitio) => `${sitio}/#organizacion`;
export const idSitio = (sitio) => `${sitio}/#sitio`;
export const idProducto = (sitio) => `${sitio}/#producto`;

/**
 * Las tres entidades permanentes del sitio. Van completas en la portada y por
 * referencia (@id) en todas las demás.
 */
export function entidadesBase(sitio) {
  const url = crearUrl(sitio);

  return [
    {
      '@type': 'Organization',
      '@id': idOrganizacion(sitio),
      name: 'Antojate',
      alternateName: 'Bite Motion',
      url: url('/'),
      logo: url('/marca/og.png'),
      description:
        'Antojate es una plataforma colombiana de menú digital con código QR para restaurantes, en la que cada plato se presenta en video vertical y el comensal pide desde su mesa.',
      // El país se declara explícito: es la señal de que esto va de Colombia, y
      // sostiene todo lo demás que se dice sobre el mercado.
      areaServed: { '@type': 'Country', name: 'Colombia' },
      knowsLanguage: 'es',
    },
    {
      '@type': 'WebSite',
      '@id': idSitio(sitio),
      url: url('/'),
      name: 'Antojate',
      inLanguage: 'es',
      publisher: { '@id': idOrganizacion(sitio) },
      // Sin potentialAction/SearchAction: el sitio no tiene buscador propio y
      // declarar uno que no existe es afirmar algo falso sobre la página.
    },
    {
      '@type': 'SoftwareApplication',
      '@id': idProducto(sitio),
      name: 'Antojate',
      url: url('/'),
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Menú digital para restaurantes',
      operatingSystem: 'Web',
      publisher: { '@id': idOrganizacion(sitio) },
      inLanguage: 'es',
      description:
        'Plataforma de menú digital con código QR para restaurantes: carta en video vertical, pedido desde la mesa, panel de cocina en tiempo real y analíticas de la carta.',
      // featureList es la lista que un asistente lee cuando alguien pregunta
      // "¿qué hace esta plataforma?". Cada línea es una función que existe hoy.
      featureList: [
        'Carta digital con un video vertical por plato',
        'Código QR distinto por mesa, generable y regenerable desde el panel',
        'Pedido desde el celular del comensal, sin instalar ninguna aplicación',
        'Panel de cocina con las comandas en tiempo real',
        'Personalización de colores, tipografía y modo claro u oscuro por restaurante',
        'Analíticas de qué platos se ven y cuáles se piden',
        'Página pública por restaurante para compartir la carta e indexarla',
      ],
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Restaurantes, cafeterías y negocios de comida con servicio en mesa',
      },
      // Sin `offers` a propósito: los precios se leen de la base de datos y esto
      // es un archivo estático. Un precio escrito aquí quedaría desactualizado
      // en el primer cambio de plan, que es peor que no declararlo. Los precios
      // vigentes salen en /llms.txt, que sí los lee de la base.
    },
  ];
}

/** BreadcrumbList a partir del camino visible en la página. */
export function migas(sitio, camino) {
  const url = crearUrl(sitio);
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

/**
 * FAQPage. Se mantiene aunque Google ya casi no muestre el resultado enriquecido
 * de FAQ: sigue siendo la forma más limpia de entregarle a un modelo una
 * pregunta con su respuesta, que es de lo que va aparecer citado en una
 * respuesta generada.
 */
export function faq(preguntas) {
  if (!preguntas?.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: preguntas.map(({ pregunta, respuesta }) => ({
      '@type': 'Question',
      name: pregunta,
      acceptedAnswer: { '@type': 'Answer', text: respuesta },
    })),
  };
}

/**
 * Una guía es un Article: tiene autor, fecha y un tema. Las páginas de producto
 * son WebPage, porque describen el producto y no son piezas editoriales.
 */
export function paginaDeContenido(sitio, pagina) {
  const url = crearUrl(sitio);
  const esGuia = pagina.coleccion === 'guia';

  return {
    '@type': esGuia ? 'Article' : 'WebPage',
    '@id': `${url(pagina.ruta)}#pagina`,
    url: url(pagina.ruta),
    name: pagina.h1,
    ...(esGuia ? { headline: pagina.h1 } : {}),
    description: pagina.descripcion,
    inLanguage: 'es',
    isPartOf: { '@id': idSitio(sitio) },
    dateModified: pagina.actualizado,
    ...(esGuia
      ? {
          datePublished: pagina.actualizado,
          author: { '@id': idOrganizacion(sitio) },
          publisher: { '@id': idOrganizacion(sitio) },
        }
      : { about: { '@id': idProducto(sitio) } }),
  };
}

/** Envuelve el grafo con su contexto. Todas las páginas salen por aquí. */
export const grafo = (nodos) => ({
  '@context': 'https://schema.org',
  '@graph': nodos.filter(Boolean),
});
