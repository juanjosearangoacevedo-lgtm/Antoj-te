// Mascota de Antojate (octubre de 2026, propuesta Parche de Barrio): una tostada
// con cara, sin fondo. La cara manda: dos ojos ovalados pegados con las pupilas
// de reojo y una boca chica corrida a la izquierda. Alrededor, lo que le da
// personaje sin recargarla: piernas con pies, brazos cortos que cambian con la
// expresión, la línea interior de la corteza, unas migas, mejillas y una
// sombra amarilla de sticker, la misma del logo.
//
// Sin naranja: contorno verde cilantro, cuerpo blanco y cara en tinto. Sobre
// un fondo verde el contorno pasa a tinto para no perderse (prop sobreVerde).
// Va en SVG plano; para redes, la figura suelta está en public/marca/mascota.svg.

export const EXPRESIONES = ['feliz', 'sorprendido', 'curioso', 'increible', 'recomendando', 'celebrando'];

const CILANTRO = '#1f8a5b';
const MAZORCA = '#f6b931';
const BLANCO = '#ffffff';
const TINTA = '#2b1b12';
const MEJILLA = '#cdeadb';
const LENGUA = '#e8736a';

// Cada expresión combina ojos, cejas, boca y la pose de los brazos.
const CARAS = {
  feliz: { ojos: 'reojo', boca: 'sonrisa', brazos: 'abajo' },
  sorprendido: { ojos: 'centro', cejas: 'arriba', boca: 'o', brazos: 'abiertos' },
  curioso: { ojos: 'guino', cejas: 'una', boca: 'pequena', brazos: 'abajo', inclinacion: -8 },
  increible: { ojos: 'felices', boca: 'abierta', brazos: 'abiertos', destellos: true },
  recomendando: { ojos: 'reojo', boca: 'sonrisa', brazos: 'senala' },
  celebrando: { ojos: 'felices', boca: 'abierta', brazos: 'arriba', destellos: true },
};

const BRAZOS = {
  abajo: 'M27 72q-8 6-8 14M93 72q8 6 8 14',
  abiertos: 'M27 70q-10-2-15-9M93 70q10-2 15-9',
  senala: 'M27 72q-8 6-8 14M93 76h17',
  arriba: 'M27 70 13 50M93 70l14-20',
};
// Las manos son un círculo al final del brazo, solo cuando se ven.
const MANOS = { senala: [[111, 76]], arriba: [[12, 48], [108, 48]] };

// Silueta de la tostada y la línea interior de la corteza.
const TOSTADA = 'M26 102V58C11 54 11 23 35 18c10-8 40-8 50 0 24 5 24 36 9 40v44q0 6-6 6H32q-6 0-6-6Z';
const MIGA = 'M33 96V54C21 50 21 28 38 25c9-6 35-6 44 0 17 3 17 25 5 29v42q0 4-4 4H37q-4 0-4-4Z';

// Ojos como en la referencia: dos óvalos pegados en el centro.
function Ojos({ tipo }) {
  if (tipo === 'felices') {
    return <path d="M44 58q8-9 16 0M60 58q8-9 16 0" fill="none" stroke={TINTA} strokeWidth="3.4" strokeLinecap="round" />;
  }
  // [radio, dx, dy] de la pupila respecto al centro de cada ojo
  const [r, dx, dy] = { centro: [3.4, 0, 0], guino: [4.2, 3, -1.5] }[tipo] ?? [4.2, 2.2, -2.8];
  const ojo = (cx) => (
    <>
      <ellipse cx={cx} cy="57" rx="8" ry="10" fill={BLANCO} stroke={TINTA} strokeWidth="3" />
      <circle cx={cx + dx} cy={57 + dy} r={r} fill={TINTA} />
      <circle cx={cx + dx + 1.4} cy={57 + dy - 1.6} r="1.2" fill={BLANCO} />
    </>
  );
  if (tipo === 'guino') {
    return (
      <>
        {ojo(52)}
        <path d="M62 57h14" stroke={TINTA} strokeWidth="3.4" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      {ojo(52)}
      {ojo(68)}
    </>
  );
}

function Cejas({ tipo }) {
  const d = { arriba: 'M45 41q6-5 12-1M63 40q6-4 12 1', una: 'M45 43q6-2 12 0M63 39q6-5 12-1' }[tipo];
  return d ? <path d={d} fill="none" stroke={TINTA} strokeWidth="2.8" strokeLinecap="round" /> : null;
}

// La boca es chica y va corrida a la izquierda, bajo el primer ojo.
function Boca({ tipo }) {
  if (tipo === 'o') return <ellipse cx="52" cy="80" rx="4" ry="5" fill={TINTA} />;
  if (tipo === 'pequena') return <path d="M47 78q5 3 10 0" fill="none" stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" />;
  if (tipo === 'abierta') {
    return (
      <>
        <path d="M44 74q8 12 16 0Z" fill={TINTA} stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M48 80q4-2.5 8 0q-4 2.5-8 0Z" fill={LENGUA} />
      </>
    );
  }
  return <path d="M45 75q6 8 12 0" fill="none" stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" />;
}

/**
 * Dibuja la mascota sola, sin envoltorio.
 * @param {string}  expresion   una de EXPRESIONES
 * @param {boolean} sobreVerde  contorno en tinto para fondos verdes
 */
export function MascotaVector({ expresion = 'feliz', sobreVerde = false, titulo }) {
  const cara = CARAS[expresion] ?? CARAS.feliz;
  const linea = sobreVerde ? TINTA : CILANTRO;

  return (
    <svg
      viewBox="0 0 120 120"
      className="block h-auto w-full overflow-visible"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : 'true'}
      focusable="false"
    >
      {/* Piernas y pies, por detrás del cuerpo. */}
      <path d="M46 104l-2 11M74 104l2 11" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="41.5" cy="116" rx="5.5" ry="3" fill={TINTA} />
      <ellipse cx="78.5" cy="116" rx="5.5" ry="3" fill={TINTA} />

      <path d={BRAZOS[cara.brazos]} fill="none" stroke={linea} strokeWidth="4.5" strokeLinecap="round" />
      {(MANOS[cara.brazos] ?? []).map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.6" fill={BLANCO} stroke={linea} strokeWidth="2.6" />
      ))}

      <g transform={cara.inclinacion ? `rotate(${cara.inclinacion} 60 64)` : undefined}>
        <path d={TOSTADA} transform="translate(4 4)" fill={MAZORCA} />
        <path d={TOSTADA} fill={BLANCO} stroke={linea} strokeWidth="4.5" strokeLinejoin="round" />
        <path d={MIGA} fill="none" stroke={CILANTRO} strokeWidth="1.8" opacity="0.35" />
        <circle cx="40" cy="90" r="1.3" fill={CILANTRO} opacity="0.4" />
        <circle cx="79" cy="93" r="1.3" fill={CILANTRO} opacity="0.4" />
        <circle cx="72" cy="86" r="1.1" fill={CILANTRO} opacity="0.4" />
        <ellipse cx="39" cy="70" rx="5" ry="3" fill={MEJILLA} />
        <ellipse cx="81" cy="70" rx="5" ry="3" fill={MEJILLA} />
        <Cejas tipo={cara.cejas} />
        <Ojos tipo={cara.ojos} />
        <Boca tipo={cara.boca} />
      </g>

      {cara.destellos && (
        <>
          <path d="M14 30v-6M8 36H2M106 30v-6M112 36h6" fill="none" stroke={MAZORCA} strokeWidth="3" strokeLinecap="round" />
          <path d="M100 8l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill={MAZORCA} />
        </>
      )}
    </svg>
  );
}

/**
 * Mascota de Antojate. El tamaño lo pone quien la usa (clases de ancho en
 * `className`); el alto sale de la proporción del dibujo.
 *
 * @param {string}  expresion   una de EXPRESIONES
 * @param {boolean} sobreVerde  contorno en tinto para fondos verdes
 * @param {string}  alt         texto alternativo; vacío = decorativa
 */
export default function MascotaAntojate({ expresion = 'feliz', sobreVerde = false, alt = '', className = '', ...props }) {
  return (
    <span className={`mascota block ${className}`} {...props}>
      <MascotaVector expresion={expresion} sobreVerde={sobreVerde} titulo={alt || undefined} />
    </span>
  );
}
