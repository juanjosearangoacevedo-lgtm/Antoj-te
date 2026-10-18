import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colores } from '@/shared/theme';

// La mascota de Antojate: una tostada con cara, sin fondo. Es el mismo dibujo de
// la web (frontend/src/shared/components/marca/MascotaAntojate.jsx); si cambia
// allá, cambia aquí. La cara manda: dos ojos ovalados pegados con las pupilas de
// reojo y una boca chica corrida a la izquierda. Alrededor: piernas, brazos que
// cambian con la expresión, la corteza, unas migas, mejillas y la sombra amarilla
// de sticker.
//
// Sobre un fondo verde el contorno pasa a tinto para no perderse (`sobreVerde`).

export type Expresion = 'feliz' | 'sorprendido' | 'curioso' | 'increible' | 'recomendando' | 'celebrando';

type Ojos = 'reojo' | 'centro' | 'guino' | 'felices';
type Cejas = 'arriba' | 'una';
type Boca = 'sonrisa' | 'o' | 'pequena' | 'abierta';
type Brazos = 'abajo' | 'abiertos' | 'senala' | 'arriba';

const CARAS: Record<Expresion, { ojos: Ojos; boca: Boca; brazos: Brazos; cejas?: Cejas; inclinacion?: number; destellos?: boolean }> = {
  feliz: { ojos: 'reojo', boca: 'sonrisa', brazos: 'abajo' },
  sorprendido: { ojos: 'centro', cejas: 'arriba', boca: 'o', brazos: 'abiertos' },
  curioso: { ojos: 'guino', cejas: 'una', boca: 'pequena', brazos: 'abajo', inclinacion: -8 },
  increible: { ojos: 'felices', boca: 'abierta', brazos: 'abiertos', destellos: true },
  recomendando: { ojos: 'reojo', boca: 'sonrisa', brazos: 'senala' },
  celebrando: { ojos: 'felices', boca: 'abierta', brazos: 'arriba', destellos: true },
};

const BRAZOS: Record<Brazos, string> = {
  abajo: 'M27 72q-8 6-8 14M93 72q8 6 8 14',
  abiertos: 'M27 70q-10-2-15-9M93 70q10-2 15-9',
  senala: 'M27 72q-8 6-8 14M93 76h17',
  arriba: 'M27 70 13 50M93 70l14-20',
};
// Las manos son un círculo al final del brazo, solo cuando se ven.
const MANOS: Partial<Record<Brazos, [number, number][]>> = {
  senala: [[111, 76]],
  arriba: [
    [12, 48],
    [108, 48],
  ],
};

const TOSTADA = 'M26 102V58C11 54 11 23 35 18c10-8 40-8 50 0 24 5 24 36 9 40v44q0 6-6 6H32q-6 0-6-6Z';
const MIGA = 'M33 96V54C21 50 21 28 38 25c9-6 35-6 44 0 17 3 17 25 5 29v42q0 4-4 4H37q-4 0-4-4Z';

const TINTA = colores.tinto;
const BLANCO = '#ffffff';
const MEJILLA = '#cdeadb';
const LENGUA = '#e8736a';

function OjosMascota({ tipo }: { tipo: Ojos }) {
  if (tipo === 'felices') {
    return <Path d="M44 58q8-9 16 0M60 58q8-9 16 0" fill="none" stroke={TINTA} strokeWidth={3.4} strokeLinecap="round" />;
  }
  // [radio, dx, dy] de la pupila respecto al centro de cada ojo
  const [r, dx, dy] = tipo === 'centro' ? [3.4, 0, 0] : tipo === 'guino' ? [4.2, 3, -1.5] : [4.2, 2.2, -2.8];
  const ojo = (cx: number) => (
    <G key={cx}>
      <Ellipse cx={cx} cy={57} rx={8} ry={10} fill={BLANCO} stroke={TINTA} strokeWidth={3} />
      <Circle cx={cx + dx} cy={57 + dy} r={r} fill={TINTA} />
      <Circle cx={cx + dx + 1.4} cy={57 + dy - 1.6} r={1.2} fill={BLANCO} />
    </G>
  );
  if (tipo === 'guino') {
    return (
      <>
        {ojo(52)}
        <Path d="M62 57h14" stroke={TINTA} strokeWidth={3.4} strokeLinecap="round" />
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

function CejasMascota({ tipo }: { tipo?: Cejas }) {
  if (!tipo) return null;
  const d = tipo === 'arriba' ? 'M45 41q6-5 12-1M63 40q6-4 12 1' : 'M45 43q6-2 12 0M63 39q6-5 12-1';
  return <Path d={d} fill="none" stroke={TINTA} strokeWidth={2.8} strokeLinecap="round" />;
}

// La boca es chica y va corrida a la izquierda, bajo el primer ojo.
function BocaMascota({ tipo }: { tipo: Boca }) {
  if (tipo === 'o') return <Ellipse cx={52} cy={80} rx={4} ry={5} fill={TINTA} />;
  if (tipo === 'pequena') return <Path d="M47 78q5 3 10 0" fill="none" stroke={TINTA} strokeWidth={3.2} strokeLinecap="round" />;
  if (tipo === 'abierta') {
    return (
      <>
        <Path d="M44 74q8 12 16 0Z" fill={TINTA} stroke={TINTA} strokeWidth={2.6} strokeLinejoin="round" />
        <Path d="M48 80q4-2.5 8 0q-4 2.5-8 0Z" fill={LENGUA} />
      </>
    );
  }
  return <Path d="M45 75q6 8 12 0" fill="none" stroke={TINTA} strokeWidth={3.2} strokeLinecap="round" />;
}

export interface MascotaProps {
  expresion?: Expresion;
  /** Ancho y alto en puntos: el dibujo es cuadrado. */
  tamano?: number;
  /** Contorno en tinto, para fondos verdes. */
  sobreVerde?: boolean;
  /** Texto para lectores de pantalla. Sin él, la mascota es decorativa. */
  etiqueta?: string;
}

export function MascotaAntojate({ expresion = 'feliz', tamano = 120, sobreVerde = false, etiqueta }: MascotaProps) {
  const cara = CARAS[expresion];
  const linea = sobreVerde ? TINTA : colores.verde;

  return (
    <Svg
      width={tamano}
      height={tamano}
      viewBox="0 0 120 120"
      accessible={Boolean(etiqueta)}
      accessibilityLabel={etiqueta}
      accessibilityElementsHidden={!etiqueta}
      importantForAccessibility={etiqueta ? 'yes' : 'no-hide-descendants'}
    >
      {/* Piernas y pies, por detrás del cuerpo. */}
      <Path d="M46 104l-2 11M74 104l2 11" stroke={TINTA} strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={41.5} cy={116} rx={5.5} ry={3} fill={TINTA} />
      <Ellipse cx={78.5} cy={116} rx={5.5} ry={3} fill={TINTA} />

      <Path d={BRAZOS[cara.brazos]} fill="none" stroke={linea} strokeWidth={4.5} strokeLinecap="round" />
      {(MANOS[cara.brazos] ?? []).map(([cx, cy]) => (
        <Circle key={cx} cx={cx} cy={cy} r={3.6} fill={BLANCO} stroke={linea} strokeWidth={2.6} />
      ))}

      <G rotation={cara.inclinacion ?? 0} origin="60, 64">
        <Path d={TOSTADA} translateX={4} translateY={4} fill={colores.mazorca} />
        <Path d={TOSTADA} fill={BLANCO} stroke={linea} strokeWidth={4.5} strokeLinejoin="round" />
        <Path d={MIGA} fill="none" stroke={colores.verde} strokeWidth={1.8} opacity={0.35} />
        <Circle cx={40} cy={90} r={1.3} fill={colores.verde} opacity={0.4} />
        <Circle cx={79} cy={93} r={1.3} fill={colores.verde} opacity={0.4} />
        <Circle cx={72} cy={86} r={1.1} fill={colores.verde} opacity={0.4} />
        <Ellipse cx={39} cy={70} rx={5} ry={3} fill={MEJILLA} />
        <Ellipse cx={81} cy={70} rx={5} ry={3} fill={MEJILLA} />
        <CejasMascota tipo={cara.cejas} />
        <OjosMascota tipo={cara.ojos} />
        <BocaMascota tipo={cara.boca} />
      </G>

      {cara.destellos ? (
        <>
          <Path d="M14 30v-6M8 36H2M106 30v-6M112 36h6" fill="none" stroke={colores.mazorca} strokeWidth={3} strokeLinecap="round" />
          <Path d="M100 8l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill={colores.mazorca} />
        </>
      ) : null}
    </Svg>
  );
}
