import { useId } from 'react';

// Identidad de Bitemo en SVG: el isotipo es un play (video) al que le falta una
// mordida (bite). Va vectorizado —no como imagen— para que se vea nítido en
// cualquier tamaño, herede el color del tema y no cueste una petición extra.

const NARANJA = '#ffab4f';
const NARANJA_MEDIO = '#ff7a00';
const NARANJA_HONDO = '#ff5a00';

/**
 * Marca gráfica sola. Úsalo cuando el nombre "Bitemo" ya está escrito al lado
 * (footer, favicon, avatares) o cuando no cabe el logotipo completo.
 */
export function BitemoIsotipo({ size = 40, className = '', ...props }) {
  // useId evita que dos isotipos en la misma página compartan el id del
  // degradado: el segundo se quedaría sin relleno.
  const uid = useId().replace(/:/g, '');
  const degradado = `bitemo-degradado-${uid}`;
  const mordida = `bitemo-mordida-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={degradado} x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={NARANJA} />
          <stop offset="0.5" stopColor={NARANJA_MEDIO} />
          <stop offset="1" stopColor={NARANJA_HONDO} />
        </linearGradient>
        {/* Lo blanco se pinta, lo negro se recorta: el círculo es la mordida. */}
        <mask id={mordida}>
          <rect width="48" height="48" fill="#fff" />
          <circle cx="43.5" cy="7" r="8.6" fill="#000" />
        </mask>
      </defs>

      <rect x="3" y="3" width="42" height="42" rx="14" fill={`url(#${degradado})`} mask={`url(#${mordida})`} />

      {/* Triángulo de play, desplazado a la derecha para que el centro óptico
          coincida con el centro geométrico del cuadrado. */}
      <path
        d="M20.6 17.4 32.4 24 20.6 30.6Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Línea pequeña bajo el nombre. 'origen' explica de dónde sale "Bitemo":
// bite + motion, que es justo lo que dibuja el isotipo (una mordida sobre un
// play). Cabe en móvil, cosa que el tagline largo no hacía.
const LEYENDAS = {
  origen: 'Bite Motion',
  tagline: 'Descubre antes de pedir',
};

/**
 * Logotipo completo: isotipo + nombre (+ leyenda opcional).
 * El nombre es texto real en Poppins, no un trazado: escala mejor, lo lee un
 * lector de pantalla y pesa cero.
 *
 * @param {'origen'|'tagline'} [leyenda]  línea pequeña bajo el nombre
 */
export function BitemoLogo({ size = 'md', leyenda, className = '' }) {
  const medidas = {
    sm: { icono: 32, texto: 'text-base', hueco: 'gap-2' },
    md: { icono: 40, texto: 'text-lg', hueco: 'gap-3' },
    lg: { icono: 52, texto: 'text-2xl', hueco: 'gap-3' },
  }[size];

  return (
    <span className={`inline-flex items-center ${medidas.hueco} ${className}`}>
      <BitemoIsotipo size={medidas.icono} className="shrink-0 drop-shadow-[0_6px_16px_rgba(255,122,0,0.28)]" />
      <span className="flex flex-col leading-none">
        <span className={`${medidas.texto} font-display font-bold tracking-[-0.02em] text-cream`}>Bitemo</span>
        {LEYENDAS[leyenda] && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-amber-soft">
            {LEYENDAS[leyenda]}
          </span>
        )}
      </span>
    </span>
  );
}
