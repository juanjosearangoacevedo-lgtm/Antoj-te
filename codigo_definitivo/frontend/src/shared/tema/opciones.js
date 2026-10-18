// ============================================================================
// FUENTE ÚNICA de la personalización visual.
//
// Cada opción se declara UNA vez aquí y de esta lista salen las tres cosas:
//   1. los controles que dibuja el panel de personalización,
//   2. las variables CSS que se aplican en el menú del comensal,
//   3. los valores que el backend acepta (el validador Zod lee estas claves).
//
// Agregar una opción nueva = agregar una entrada aquí + su columna en la tabla.
// No hay que tocar el panel ni el comensal.
//
// REGLA CENTRAL: `null`, `undefined` y `''` significan "usa el valor por
// defecto de Antojate". Nunca se escribe una variable CSS con un valor vacío.
// Es lo que evita que un tema a medio llenar pise el diseño de la plataforma.
// ============================================================================

// --- Grupos: el orden aquí es el orden en que aparecen en el panel ---
export const GRUPOS = [
  { clave: 'marca', titulo: 'Colores y marca', descripcion: 'La identidad visual que verá tu comensal.' },
  {
    clave: 'bienvenida',
    titulo: 'Bienvenida',
    descripcion: 'La primera pantalla, antes de elegir categoría.',
  },
  { clave: 'tipografia', titulo: 'Tipografía', descripcion: 'Cómo se leen los títulos y los textos.' },
  { clave: 'distribucion', titulo: 'Distribución', descripcion: 'Cómo se organiza el menú en pantalla.' },
  { clave: 'tarjetas', titulo: 'Tarjetas y bordes', descripcion: 'La forma y el relieve de cada elemento.' },
  { clave: 'botones', titulo: 'Botones', descripcion: 'El aspecto de las acciones principales.' },
  { clave: 'animacion', titulo: 'Movimiento', descripcion: 'Cuánta animación quieres en la experiencia.' },
];

// --- Escalas: traducen una elección en palabras a un valor CSS concreto ---
const RADIOS = { recto: '0px', suave: '8px', medio: '16px', redondo: '28px' };
const SOMBRAS = {
  ninguna: 'none',
  sutil: '0 1px 2px rgba(0,0,0,0.4)',
  marcada: '0 12px 32px -12px rgba(0,0,0,0.7)',
};
const ESPACIADOS = { compacto: '0.75rem', normal: '1.25rem', amplio: '2rem' };
const ALTURAS = { baja: '7rem', media: '10rem', alta: '14rem' };
const VELOCIDADES = { lenta: '380ms', normal: '200ms', rapida: '110ms' };
const FORMA_BOTON = { recto: '0px', redondeado: '12px', pildora: '999px' };

export const OPCIONES = [
  // ---------------------------------------------------------------- marca ---
  {
    clave: 'color_primario',
    grupo: 'marca',
    tipo: 'color',
    etiqueta: 'Color de acento',
    ayuda: 'Precios, íconos activos y detalles destacados.',
    variable: '--c-primario',
    // El acento genera además su tono oscuro y su versión suave, para que la
    // paleta conserve profundidad en vez de quedar plana en un solo tono.
    derivadas: (hex) => ({
      '--c-primario-dim': mezclar(hex, '#000000', 0.18),
      '--c-primario-soft': mezclar(hex, '#ffffff', 0.45),
      '--accent-soft': conAlfa(hex, 0.16),
    }),
  },
  {
    clave: 'color_fondo',
    grupo: 'marca',
    tipo: 'color',
    etiqueta: 'Fondo',
    ayuda: 'El lienzo sobre el que se muestra todo el menú.',
    variable: '--c-base',
    derivadas: (hex) => ({
      '--c-surface': mezclar(hex, '#ffffff', 0.06),
      '--c-surface2': mezclar(hex, '#ffffff', 0.11),
      '--c-line': mezclar(hex, '#ffffff', 0.16),
    }),
  },
  {
    clave: 'color_texto',
    grupo: 'marca',
    tipo: 'color',
    etiqueta: 'Texto',
    ayuda: 'Color de títulos y descripciones.',
    variable: '--c-cream',
    derivadas: (hex) => ({ '--c-muted': conAlfa(hex, 0.62) }),
  },
  {
    clave: 'color_botones',
    grupo: 'marca',
    tipo: 'color',
    etiqueta: 'Botones',
    ayuda: 'Fondo del botón principal (“Agregar”, “Enviar pedido”).',
    variable: '--c-boton',
    // El texto del botón se calcula solo para que siempre haya contraste
    // suficiente: es un requisito de accesibilidad, no una preferencia.
    derivadas: (hex) => ({ '--c-boton-texto': textoLegibleSobre(hex) }),
  },
  {
    clave: 'modo',
    grupo: 'marca',
    tipo: 'opciones',
    etiqueta: 'Modo',
    ayuda: 'Claro para cartas luminosas, oscuro para una experiencia cinematográfica.',
    valores: [
      { valor: 'oscuro', nombre: 'Oscuro' },
      { valor: 'claro', nombre: 'Claro' },
    ],
    atributo: 'data-modo', // se aplica en <html>, no como variable CSS
  },

  // ----------------------------------------------------------- bienvenida ---
  {
    clave: 'mensaje_bienvenida',
    grupo: 'bienvenida',
    tipo: 'texto',
    etiqueta: 'Saludo',
    ayuda: 'Lo primero que lee el comensal al escanear el QR.',
    max: 200,
    marcador: '¡Bienvenido a tu restaurante!',
  },
  {
    clave: 'llamar_mesero',
    grupo: 'bienvenida',
    tipo: 'switch',
    etiqueta: 'Botón para llamar al mesero',
    ayuda: 'El llamado aparece en el panel de cocina. Enciéndelo solo si alguien lo está mirando.',
    defaultEncendido: false,
    // Se atiende EN el panel de cocina, así que sin esa pantalla el botón no
    // tendría a quién avisar. La ruta del backend exige la misma feature.
    requiereFeature: 'kds',
  },
  {
    clave: 'redes_sociales',
    grupo: 'bienvenida',
    tipo: 'redes',
    etiqueta: 'Redes sociales',
    ayuda: 'Aparecen como íconos bajo el saludo. Solo enlaces que empiecen por https://',
  },

  // ----------------------------------------------------------- tipografía ---
  {
    clave: 'tipografia_titulos',
    grupo: 'tipografia',
    tipo: 'opciones',
    etiqueta: 'Títulos',
    ayuda: 'La fuente de los nombres de platos y categorías.',
    variable: '--font-display',
    valores: [
      { valor: '', nombre: 'Baloo 2 (por defecto)' },
      { valor: '"Fraunces", serif', nombre: 'Fraunces — serif con carácter' },
      { valor: '"Playfair Display", serif', nombre: 'Playfair Display — clásica' },
      { valor: '"Manrope", sans-serif', nombre: 'Manrope — moderna' },
      { valor: '"Inter", sans-serif', nombre: 'Inter — neutra' },
    ],
  },
  {
    clave: 'tipografia_cuerpo',
    grupo: 'tipografia',
    tipo: 'opciones',
    etiqueta: 'Textos',
    ayuda: 'La fuente de descripciones y textos largos.',
    variable: '--font-body',
    valores: [
      { valor: '', nombre: 'Nunito Sans (por defecto)' },
      { valor: '"Manrope", sans-serif', nombre: 'Manrope' },
      { valor: '"Inter", sans-serif', nombre: 'Inter' },
      { valor: '"Fraunces", serif', nombre: 'Fraunces' },
    ],
  },
  // NOTA: aquí iba un control de "iconografía" (lineal / relleno / emoji). Se
  // quitó a propósito: la columna existe en la base pero ningún componente del
  // menú cambia sus íconos según ese valor, así que era un ajuste que no hacía
  // nada. Vuelve a esta lista cuando el comensal sepa interpretarlo.

  // ---------------------------------------------------------- distribución ---
  {
    clave: 'layout_categorias',
    grupo: 'distribucion',
    tipo: 'opciones',
    etiqueta: 'Diseño de las categorías',
    ayuda: 'Cómo se ve la pantalla donde el comensal elige qué explorar.',
    valores: [
      { valor: '', nombre: 'Pantalla completa — mosaicos grandes con foto', recomendado: true },
      { valor: 'cuadricula', nombre: 'Cuadrícula de 2 columnas' },
      { valor: 'lista', nombre: 'Lista compacta' },
    ],
  },
  {
    clave: 'preview_categoria',
    grupo: 'distribucion',
    tipo: 'opciones',
    etiqueta: 'Vista previa de cada categoría',
    ayuda: 'Qué se ve en la tarjeta ANTES de entrar a la categoría.',
    valores: [
      { valor: '', nombre: 'Imagen destacada', recomendado: true },
      { valor: 'video', nombre: 'Video corto en bucle' },
      { valor: 'animacion', nombre: 'Animación (la imagen se acerca lentamente)' },
      { valor: 'ninguna', nombre: 'Sin vista previa — solo el nombre' },
    ],
  },
  {
    clave: 'altura_categoria',
    grupo: 'distribucion',
    tipo: 'opciones',
    etiqueta: 'Tamaño de las imágenes',
    ayuda: 'Qué tan altas son las tarjetas de categoría.',
    variable: '--alto-categoria',
    escala: ALTURAS,
    valores: [
      { valor: 'baja', nombre: 'Compacta' },
      { valor: '', nombre: 'Media (por defecto)' },
      { valor: 'alta', nombre: 'Protagonista' },
    ],
  },
  {
    clave: 'espaciado',
    grupo: 'distribucion',
    tipo: 'opciones',
    etiqueta: 'Aire entre elementos',
    ayuda: 'Más aire se lee mejor; menos aire muestra más platos de una vez.',
    variable: '--espaciado',
    escala: ESPACIADOS,
    valores: [
      { valor: 'compacto', nombre: 'Compacto' },
      { valor: '', nombre: 'Normal (por defecto)' },
      { valor: 'amplio', nombre: 'Amplio' },
    ],
  },
  {
    clave: 'mostrar_precio_feed',
    grupo: 'distribucion',
    tipo: 'switch',
    etiqueta: 'Mostrar el precio sobre el video',
    ayuda: 'Desactívalo si prefieres que el comensal entre al plato para verlo.',
    defaultEncendido: true,
  },

  // ------------------------------------------------------------- tarjetas ---
  {
    clave: 'radio_esquinas',
    grupo: 'tarjetas',
    tipo: 'opciones',
    etiqueta: 'Esquinas',
    ayuda: 'Redondeado de tarjetas, imágenes y campos.',
    variable: '--radio-tarjetas',
    escala: RADIOS,
    valores: [
      { valor: 'recto', nombre: 'Rectas' },
      { valor: 'suave', nombre: 'Suaves' },
      { valor: '', nombre: 'Medias (por defecto)' },
      { valor: 'redondo', nombre: 'Muy redondeadas' },
    ],
  },
  {
    clave: 'sombras',
    grupo: 'tarjetas',
    tipo: 'opciones',
    etiqueta: 'Relieve',
    ayuda: 'Cuánto se despegan las tarjetas del fondo.',
    variable: '--sombra-md',
    escala: SOMBRAS,
    valores: [
      { valor: 'ninguna', nombre: 'Plano' },
      { valor: '', nombre: 'Sutil (por defecto)' },
      { valor: 'marcada', nombre: 'Marcado' },
    ],
  },
  {
    clave: 'opacidad_overlay',
    grupo: 'tarjetas',
    tipo: 'rango',
    etiqueta: 'Oscurecer las fotos',
    ayuda: 'Sube esto si el nombre de la categoría se pierde sobre la foto.',
    min: 0,
    max: 100,
    paso: 5,
    unidad: '%',
    variable: '--overlay-categoria',
    aCss: (v) => String(Number(v) / 100),
    defaultNumero: 55,
  },

  // -------------------------------------------------------------- botones ---
  {
    clave: 'estilo_botones',
    grupo: 'botones',
    tipo: 'opciones',
    etiqueta: 'Relleno',
    ayuda: 'Cómo se pinta el botón principal.',
    valores: [
      { valor: '', nombre: 'Sólido (por defecto)' },
      { valor: 'contorno', nombre: 'Solo contorno' },
      { valor: 'suave', nombre: 'Fondo suave' },
    ],
  },
  {
    clave: 'forma_botones',
    grupo: 'botones',
    tipo: 'opciones',
    etiqueta: 'Forma',
    ayuda: 'El redondeado de los botones.',
    variable: '--radio-boton',
    escala: FORMA_BOTON,
    valores: [
      { valor: 'recto', nombre: 'Recto' },
      { valor: '', nombre: 'Redondeado (por defecto)' },
      { valor: 'pildora', nombre: 'Píldora' },
    ],
  },

  // ------------------------------------------------------------ animación ---
  {
    clave: 'animaciones',
    grupo: 'animacion',
    tipo: 'opciones',
    etiqueta: 'Nivel de animación',
    ayuda: 'Afecta la entrada de categorías, el cambio de pantalla y el toque sobre un plato.',
    valores: [
      { valor: '', nombre: 'Completas (por defecto)', recomendado: true },
      { valor: 'sutiles', nombre: 'Sutiles — solo lo esencial' },
      { valor: 'ninguna', nombre: 'Ninguna — todo instantáneo' },
    ],
    atributo: 'data-animaciones',
  },
  {
    clave: 'velocidad_animacion',
    grupo: 'animacion',
    tipo: 'opciones',
    etiqueta: 'Velocidad',
    ayuda: 'Qué tan rápido ocurren las transiciones.',
    variable: '--motion-base',
    escala: VELOCIDADES,
    valores: [
      { valor: 'lenta', nombre: 'Pausada' },
      { valor: '', nombre: 'Normal (por defecto)' },
      { valor: 'rapida', nombre: 'Ágil' },
    ],
    derivadas: (_, bruto) => {
      const base = parseInt(VELOCIDADES[bruto] ?? VELOCIDADES.normal, 10);
      return { '--motion-fast': `${Math.round(base * 0.75)}ms`, '--motion-slow': `${Math.round(base * 1.25)}ms` };
    },
  },
];

// Índice por clave, para no recorrer el arreglo en cada lectura.
export const OPCION_POR_CLAVE = Object.fromEntries(OPCIONES.map((o) => [o.clave, o]));

// Las claves que el backend acepta y guarda. El validador Zod las deriva de aquí.
export const CLAVES_TEMA = OPCIONES.map((o) => o.clave);

// ---------------------------------------------------------------------------
// Utilidades de color. Se calculan en JS (y no con color-mix de CSS) para
// poder mostrar la misma paleta en la vista previa del panel.
// ---------------------------------------------------------------------------

function aRgb(hex) {
  const limpio = String(hex).replace('#', '').trim();
  const completo = limpio.length === 3 ? limpio.split('').map((c) => c + c).join('') : limpio;
  if (completo.length !== 6) return null;
  const n = parseInt(completo, 16);
  return Number.isNaN(n) ? null : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const aHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');

/** Mezcla dos colores. `proporcion` 0 = solo `hex`, 1 = solo `hacia`. */
export function mezclar(hex, hacia, proporcion) {
  const a = aRgb(hex);
  const b = aRgb(hacia);
  if (!a || !b) return hex;
  return aHex({
    r: a.r + (b.r - a.r) * proporcion,
    g: a.g + (b.g - a.g) * proporcion,
    b: a.b + (b.b - a.b) * proporcion,
  });
}

export function conAlfa(hex, alfa) {
  const c = aRgb(hex);
  return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${alfa})` : hex;
}

/** Luminancia relativa según WCAG 2.1. */
function luminancia(hex) {
  const c = aRgb(hex);
  if (!c) return 0;
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
}

/** Razón de contraste WCAG entre dos colores (1 = idénticos, 21 = máximo). */
export function contraste(hexA, hexB) {
  const a = luminancia(hexA);
  const b = luminancia(hexB);
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

// Candidatos a texto sobre un fondo de color, en orden de preferencia estética.
// El primero es el marrón oscuro del design system, que acompaña mejor a los
// tonos cálidos que el negro puro.
const TEXTO_MARCA = '#1f1200';
const TEXTO_CLARO = '#ffffff';
const TEXTO_NEGRO = '#000000';
const AA = 4.5; // razón mínima de contraste para texto normal (WCAG 2.1 AA)

/**
 * Elige el color de texto sobre un fondo comparando el contraste REAL, no un
 * umbral de luminancia. La diferencia importa: sobre el naranja de marca
 * (#FF7A00) un umbral elegiría blanco, que da 2.6:1 y no pasa AA, mientras que
 * el texto oscuro da 6.6:1.
 *
 * Se prefiere el marrón de marca siempre que ya alcance AA; si no llega, se
 * toma el que más contraste dé entre blanco y negro puro. Hay colores (rojos
 * medios como #d8482f) donde ni el blanco ni el marrón llegan a 4.5:1 y solo
 * el negro puro lo consigue.
 */
export function textoLegibleSobre(hex) {
  if (!aRgb(hex)) return TEXTO_MARCA;

  if (contraste(hex, TEXTO_MARCA) >= AA) return TEXTO_MARCA;

  return contraste(hex, TEXTO_CLARO) >= contraste(hex, TEXTO_NEGRO) ? TEXTO_CLARO : TEXTO_NEGRO;
}
