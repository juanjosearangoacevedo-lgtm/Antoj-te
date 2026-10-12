// Menú de ejemplo al que apunta la landing: mesa 1 del restaurante de prueba
// ("Demo Bite Motion", restaurante 100).
//
// El token es una cadena fija y no un UUID a propósito: lo fijan así tanto el
// seed (backend/scripts/seedDemoRestaurante.js) como el esquema
// (backend/migrations/bitemo_completo.sql), justamente para que este enlace no
// dependa de un identificador que cambia en cada entorno.
//
// Si algún día el restaurante de prueba se monta con otro token, se cambia con
// VITE_DEMO_MESA_TOKEN y no hay que tocar ningún componente.
export const DEMO_MESA_TOKEN = import.meta.env.VITE_DEMO_MESA_TOKEN || 'bitemo-demo';

export const DEMO_URL = `/menu?mesa=${encodeURIComponent(DEMO_MESA_TOKEN)}`;

// El ejemplo se abre en una pestaña nueva a propósito: el menú del comensal es
// una experiencia a pantalla completa pensada para entrar por QR, así que no
// tiene forma de volver a la landing. Navegando en la misma pestaña, el
// visitante que solo quería echar un vistazo se quedaría atrapado.
//
// rel="noopener" es obligatorio con target="_blank": sin él, la página abierta
// recibe acceso a window.opener y puede redirigir la nuestra.
export const DEMO_LINK_PROPS = {
  href: DEMO_URL,
  target: '_blank',
  rel: 'noopener noreferrer',
};

// ---------------------------------------------------------------------------
// Video de demostración del hero
//
// El teléfono del hero está preparado para reproducir un video que muestre la
// app funcionando. MIENTRAS NO EXISTA, el hueco no se queda en blanco: se
// mantiene la maqueta dibujada en CSS que ya estaba, así que la landing nunca
// enseña un rectángulo vacío ni un reproductor roto.
//
// Para ponerlo basta con definir VITE_VIDEO_DEMO_URL (y opcionalmente el póster
// que se ve mientras carga). No hay que tocar el componente.
//
// Qué grabar: vertical y sin audio —se reproduce en silencio, que es lo único
// que los navegadores permiten autoarrancar—, corto y en bucle. El recorrido
// natural es el mismo que cuenta "Cómo funciona": escanear, ver el plato en
// video, agregar al pedido.
//
// La proporción del marco es 9/19 (ver .telefono-pantalla en LandingPage.css),
// que es prácticamente la de una grabación de pantalla de celular actual
// (9/19.5 en iPhone, 9/20 en muchos Android). Un 9/16 clásico entra igual, pero
// `object-cover` le recorta los lados.
//
// DEBE SER MP4, no HLS: aquí se usa un <video src> a secas y hls.js vive solo en
// el trozo del menú. Apuntar esto a un .m3u8 de Bunny lo devolvería al paquete
// de la landing y le sumaría 342 KB a la página que más rápido tiene que abrir.
// ---------------------------------------------------------------------------
export const VIDEO_DEMO = {
  url: import.meta.env.VITE_VIDEO_DEMO_URL || '',
  poster: import.meta.env.VITE_VIDEO_DEMO_POSTER || '',
};
