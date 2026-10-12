// Textos de la landing.
//
// Estaban repartidos dentro de cada componente. Se sacan aquí por la misma razón
// que preguntas.js: el build necesita escribir la landing como HTML estático en
// dist/index.html (ver seo/contenido-html.js), porque los rastreadores de los
// buscadores con IA no ejecutan JavaScript y para ellos la SPA está vacía.
//
// Si el texto viviera solo en el JSX habría que copiarlo al generador, y la
// versión que ve un buscador acabaría diciendo algo distinto de la que ve el
// visitante. Con una sola fuente eso no puede pasar.
//
// Aquí va SOLO texto. Los iconos siguen en los componentes, mapeados por
// `clave`: son presentación, y meterlos aquí obligaría al generador —que corre
// en Node, sin React— a importar la librería de iconos.

export const HERO = {
  // El H1 carga el término que se busca posicionar sin perder el gancho de
  // marca. `destacado` es el trozo que el componente pinta en naranja; va por
  // separado para que el HTML del buscador reciba la frase entera y limpia.
  h1: 'El menú digital de tu restaurante, ahora en video.',
  destacado: 'en video',
  entradilla:
    'Tus comensales escanean el código QR de la mesa, ven cada plato en video y piden desde su propio celular. Una carta digital sin app, sin registro y sin reimprimir nada.',
  etiqueta: 'Visual commerce para restaurantes',
  pilares: [
    { clave: 'video', texto: 'Videos que abren el apetito' },
    { clave: 'pedido', texto: 'Pide sin salir del video' },
    { clave: 'analitica', texto: 'Analíticas que hacen crecer tu carta' },
  ],
};

export const COMO_FUNCIONA = {
  h2: 'Cómo funciona el menú digital con QR',
  entradilla: 'Tres pasos desde que el comensal se sienta hasta que su pedido está en cocina.',
  pasos: [
    {
      clave: 'qr',
      titulo: 'Escanea el QR de la mesa',
      texto:
        'Cada mesa tiene su propio código. El comensal abre el menú del restaurante al instante, ya identificado en su mesa.',
    },
    {
      clave: 'video',
      titulo: 'Ve el plato en video',
      texto:
        'Un feed vertical, plato por plato: cómo se ve, cómo se sirve, qué lleva. Se decide con los ojos, no leyendo una lista.',
    },
    {
      clave: 'pedido',
      titulo: 'Pide desde su celular',
      texto:
        'Arma el pedido con sus notas y modificaciones, lo confirma, y la comanda entra directo al panel de cocina.',
    },
  ],
};

export const BENEFICIOS = {
  // Antes era "Todo el restaurante, en una sola experiencia": cierto pero mudo.
  // Este dice lo mismo y de paso nombra el término con el que la mitad del
  // mercado busca esto ("carta digital"), sin sonar a relleno.
  h2: 'Todo lo que necesita tu carta digital, en una sola plataforma',
  entradilla: 'Del video que enamora al comensal hasta la comanda que llega a cocina.',
  items: [
    {
      clave: 'video',
      titulo: 'Carta en video',
      texto:
        'Cada plato con su video vertical, servido por CDN y con calidad adaptativa: se ve fluido incluso con la señal del restaurante.',
    },
    {
      clave: 'pedido',
      titulo: 'Pedido desde la mesa',
      texto:
        'Carrito con cantidades, modificadores y notas para cocina. El comensal sigue el estado de su pedido en vivo.',
    },
    {
      clave: 'cocina',
      titulo: 'Panel de cocina',
      texto: 'Las comandas entran en tiempo real y avanzan por estados. Sin papeles ni gritos entre salón y cocina.',
    },
    {
      clave: 'marca',
      titulo: 'Con la cara de tu marca',
      texto: 'Colores, tipografía y modo claro u oscuro por restaurante. Tus comensales ven tu marca, no la nuestra.',
    },
    {
      clave: 'qr',
      titulo: 'Un QR por mesa',
      texto: 'Genera, imprime y regenera los códigos desde el panel. Cada pedido llega identificado con su mesa.',
    },
    {
      clave: 'analitica',
      titulo: 'Qué se ve y qué se vende',
      texto: 'Embudo de conversión, platos más vistos y tiempos de cocina. Datos para decidir qué mantener en la carta.',
    },
  ],
};

export const PRECIOS = {
  h2: 'Un precio por restaurante, sin comisión por pedido.',
  entradilla: 'Pagas la plataforma, no lo que vendes. Cambia de plan cuando quieras.',
};

export const PREGUNTAS = {
  h2: 'Preguntas frecuentes sobre el menú digital',
  entradilla: 'Lo que más nos preguntan los restaurantes antes de cambiar la carta impresa.',
};

export const CTA_FINAL = {
  h2: 'Crea la experiencia visual que tu carta necesita.',
  texto:
    'Bitemo pone el foco en tus platos, tus colores y tu voz. Actualiza tu menú, sube videos y convierte cada visita en una orden.',
};

// Enlaces del pie hacia el contenido indexable. Están aquí, y no sueltos en el
// componente, porque el generador de HTML estático los necesita: un rastreador
// descubre /guias y /restaurantes siguiendo estos enlaces desde la portada, que
// es la página que más autoridad recibe. Sin ellos serían páginas huérfanas,
// listadas en el sitemap pero sin un solo enlace apuntándolas.
export const ENLACES_CONTENIDO = [
  { ruta: '/menu-digital-con-video', texto: 'Menú digital con video' },
  { ruta: '/menu-qr-para-restaurantes', texto: 'Menú QR para restaurantes' },
  { ruta: '/restaurantes', texto: 'Restaurantes en Bitemo' },
  { ruta: '/guias', texto: 'Guías para restaurantes' },
];
