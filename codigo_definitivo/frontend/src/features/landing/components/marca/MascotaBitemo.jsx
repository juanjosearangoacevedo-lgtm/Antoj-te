import { useState } from 'react';

// La mascota del manual de marca es un render 3D: vive como PNG en
// public/marca/ (ver public/marca/LEEME.md para los nombres exactos).
// Mientras ese archivo no exista —o si falla la descarga— se dibuja la versión
// plana en SVG de aquí abajo, para que la landing nunca muestre el ícono de
// imagen rota ni un hueco en la maquetación.
//
// El vector no copia el render: lo traduce a lenguaje plano quedándose con lo
// que hace reconocible al personaje —ojos grandes de esclerótica blanca, gorro
// de aviador con gafas ámbar subidas a la frente, mechón naranja de marca,
// cara clara y chaqueta con la insignia B.

export const EXPRESIONES = ['feliz', 'sorprendido', 'curioso', 'increible', 'recomendando', 'celebrando'];

const PELAJE = '#e8933f';
const PELAJE_SOMBRA = '#cd7a2c';
const PELAJE_CLARO = '#ffdcae';
const CUERO = '#6b4426';
const CUERO_CLARO = '#8a5a30';
const MARCO = '#472b15';
const CRISTAL = '#ffc46b';
const TINTA = '#2a1a0e';
const CHAQUETA = '#54341d';
const NARANJA = '#ff7a00';
const NARANJA_CLARO = '#ffc45c';
const NARIZ = '#b3673a';
const BOCA = '#7a3520';
const LENGUA = '#f07a68';

// Cada expresión del manual se arma combinando ojos, boca y algún extra.
const CARAS = {
  feliz: { ojos: 'abiertos', boca: 'sonrisa' },
  sorprendido: { ojos: 'enormes', boca: 'o' },
  curioso: { ojos: 'abiertos', boca: 'pequena', inclinacion: -7 },
  increible: { ojos: 'felices', boca: 'abierta', destellos: true },
  recomendando: { ojos: 'abiertos', boca: 'sonrisa', pulgar: true },
  celebrando: { ojos: 'felices', boca: 'abierta', destellos: true },
};

function Ojo({ cx, tipo }) {
  if (tipo === 'felices') {
    // Ojos cerrados de alegría: dos arcos hacia arriba.
    return (
      <path d={`M${cx - 15} 134q15-19 30 0`} fill="none" stroke={TINTA} strokeWidth="6.5" strokeLinecap="round" />
    );
  }

  const enormes = tipo === 'enormes';
  const rx = enormes ? 15.5 : 14;
  const ry = enormes ? 18.5 : 16.5;
  const pupila = enormes ? 7.5 : 9.5;

  return (
    <>
      <ellipse cx={cx} cy="130" rx={rx} ry={ry} fill="#fff" />
      <circle cx={cx + 2} cy="131" r={pupila} fill={TINTA} />
      <circle cx={cx + 4.5} cy="127" r="3.6" fill="#fff" />
      <circle cx={cx - 1} cy="135" r="1.8" fill="#fff" opacity="0.7" />
    </>
  );
}

function Boca({ tipo }) {
  if (tipo === 'abierta') {
    return (
      <>
        <path d="M86 156c16 5 32 5 48 0 0 17-11 26-24 26s-24-9-24-26Z" fill={BOCA} />
        <path d="M98 172c7 5 17 5 24 0 1 6-5 9-12 9s-13-3-12-9Z" fill={LENGUA} />
      </>
    );
  }
  if (tipo === 'o') return <ellipse cx="110" cy="166" rx="10" ry="12.5" fill={BOCA} />;
  if (tipo === 'pequena') return <ellipse cx="110" cy="165" rx="7" ry="8.5" fill={BOCA} />;
  return <path d="M88 160q22 20 44 0" fill="none" stroke={BOCA} strokeWidth="6" strokeLinecap="round" />;
}

function Destello({ x, y, r }) {
  return (
    <path
      d={`M${x} ${y - r}q${r * 0.22} ${r * 0.62} ${r * 0.78} ${r}q-${r * 0.56} ${r * 0.38}-${r * 0.78} ${r}q-${r * 0.22}-${r * 0.62}-${r * 0.78}-${r}q${r * 0.56}-${r * 0.38} ${r * 0.78}-${r}Z`}
      fill={NARANJA_CLARO}
    />
  );
}

/** Versión plana de la mascota: busto cerrado, para que flote sin verse recortada. */
function MascotaVector({ expresion }) {
  const cara = CARAS[expresion] ?? CARAS.feliz;

  return (
    <svg viewBox="0 0 220 260" fill="none" aria-hidden="true" focusable="false" className="block h-auto w-full">
      {/* ---- cuerpo ---- */}
      <path d="M92 168h36v32c0 11-36 11-36 0Z" fill={PELAJE_SOMBRA} />
      <path d="M110 196c-34 0-56 20-58 42-1 12 6 22 20 22h76c14 0 21-10 20-22-2-22-24-42-58-42Z" fill={CHAQUETA} />
      <path d="M80 200c9 9 19 13 30 13s21-4 30-13l8 8c-12 12-24 17-38 17s-26-5-38-17Z" fill={NARANJA} />
      <circle cx="110" cy="240" r="14" fill={NARANJA} />
      <text
        x="110"
        y="240"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Poppins, ui-sans-serif, sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="#fff"
      >
        B
      </text>

      {cara.pulgar && (
        <g>
          <rect x="160" y="206" width="38" height="33" rx="14" fill={PELAJE} />
          <rect x="163" y="181" width="18" height="31" rx="9" fill={PELAJE} />
          <path d="M170 216h20M170 225h20" stroke={PELAJE_SOMBRA} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="157" y="235" width="44" height="14" rx="7" fill={CHAQUETA} />
        </g>
      )}

      {/* ---- cabeza (se inclina entera en 'curioso') ---- */}
      <g transform={cara.inclinacion ? `rotate(${cara.inclinacion} 110 160)` : undefined}>
        {/* orejas: por debajo de la correa de las gafas, para que no compitan */}
        <circle cx="41" cy="122" r="24" fill={PELAJE} />
        <circle cx="41" cy="122" r="13" fill={PELAJE_CLARO} />
        <circle cx="179" cy="122" r="24" fill={PELAJE} />
        <circle cx="179" cy="122" r="13" fill={PELAJE_CLARO} />

        {/* cráneo y cara clara */}
        <ellipse cx="110" cy="118" rx="68" ry="66" fill={PELAJE} />
        <ellipse cx="110" cy="138" rx="47" ry="42" fill={PELAJE_CLARO} />

        {/* Gorro de aviador. El arco (rx 62.5 / ry 46) sigue la curva del cráneo
            en lugar de ser un semicírculo, así el gorro calza en vez de flotar. */}
        <path d="M47.5 92a62.5 46 0 0 1 125 0v3c-20 7-42 10-62.5 10s-42.5-3-62.5-10Z" fill={CUERO} />
        <path d="M60 70a56 30 0 0 1 100 0" stroke={CUERO_CLARO} strokeWidth="6" strokeLinecap="round" opacity="0.55" />

        {/* mechón naranja de marca */}
        <path d="M108 50c-5-11 0-24 11-32-2 11 5 13 9 22 5 11 0 22-9 24-6 1-9-4-11-14Z" fill={NARANJA} />
        <path d="M110 46c-2-6 1-13 6-18-1 6 3 8 5 14 3 7 0 13-5 14-3 0-5-4-6-10Z" fill={NARANJA_CLARO} />

        {/* Gafas subidas a la frente: la correa cruza de oreja a oreja y los
            aros bajan hasta la ceja, que es lo que las lee como "gafas" y no
            como un segundo par de ojos. */}
        <path d="M40 84h140" stroke={MARCO} strokeWidth="17" strokeLinecap="round" />
        <circle cx="74" cy="86" r="26" fill={MARCO} />
        <circle cx="74" cy="86" r="17" fill={CRISTAL} />
        <circle cx="146" cy="86" r="26" fill={MARCO} />
        <circle cx="146" cy="86" r="17" fill={CRISTAL} />
        <path d="M64 79a13 13 0 0 1 11-7" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <path d="M136 79a13 13 0 0 1 11-7" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />

        {/* rostro */}
        <Ojo cx={88} tipo={cara.ojos} />
        <Ojo cx={132} tipo={cara.ojos} />
        <ellipse cx="110" cy="150" rx="9" ry="6.5" fill={NARIZ} />
        <Boca tipo={cara.boca} />

        <ellipse cx="68" cy="158" rx="12" ry="7" fill={NARANJA} opacity="0.28" />
        <ellipse cx="152" cy="158" rx="12" ry="7" fill={NARANJA} opacity="0.28" />
      </g>

      {cara.destellos && (
        <>
          <Destello x={24} y={62} r={11} />
          <Destello x={198} y={50} r={13} />
          <Destello x={188} y={162} r={8} />
        </>
      )}
    </svg>
  );
}

/**
 * Mascota de Bitemo. El tamaño lo pone quien la usa (clases de ancho en
 * `className`); el alto siempre sale de la proporción de la imagen.
 *
 * @param {string} expresion  archivo public/marca/mascota-<expresion>.png
 * @param {string} alt        texto alternativo; vacío = decorativa
 */
export default function MascotaBitemo({ expresion = 'feliz', alt = '', className = '', ...props }) {
  const [sinArchivo, setSinArchivo] = useState(false);

  return (
    <span className={`mascota block ${className}`} {...props}>
      {sinArchivo ? (
        <MascotaVector expresion={expresion} />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}marca/mascota-${expresion}.png`}
          alt={alt}
          aria-hidden={alt ? undefined : 'true'}
          onError={() => setSinArchivo(true)}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      )}
    </span>
  );
}
