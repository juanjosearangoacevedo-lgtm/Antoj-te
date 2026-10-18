import { useId } from 'react';

// Identidad de Antojate en SVG: el isotipo es un play (video) al que le falta una
// mordida (bite). Va vectorizado —no como imagen— para que se vea nítido en
// cualquier tamaño y no cueste una petición extra.
//
// Versión "con movimiento" (octubre de 2026, propuesta Parche de Barrio): el
// cuadro va inclinado, con degradado verde, brillo, sombra amarilla de sticker
// y tres líneas de velocidad a la izquierda. El vaivén lo anima LandingPage.css
// (.logo-vivo-icono) y se apaga con "reducir movimiento".

const VERDE_CLARO = '#3aa876';
const VERDE = '#1f8a5b';
const VERDE_HONDO = '#145c3c';
const MAZORCA = '#f6b931';

/**
 * Marca gráfica sola. Úsalo cuando el nombre "Antojate" ya está escrito al lado
 * o cuando no cabe el logotipo completo.
 *
 * @param {number}  size     alto en px; el ancho sale de la proporción
 * @param {boolean} lineas   líneas de velocidad (se quitan en tamaños chicos)
 */
export function IsotipoAntojate({ size = 40, lineas = true, className = '', ...props }) {
  // useId evita que dos isotipos en la misma página compartan ids: el segundo
  // se quedaría sin degradado ni mordida.
  const uid = useId().replace(/:/g, '');
  const degradado = `antojate-degradado-${uid}`;
  const mordida = `antojate-mordida-${uid}`;

  return (
    <svg
      width={Math.round((size * 60) / 52)}
      height={size}
      viewBox="0 0 60 52"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id={degradado} x1="14" y1="4" x2="54" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={VERDE_CLARO} />
          <stop offset="0.55" stopColor={VERDE} />
          <stop offset="1" stopColor={VERDE_HONDO} />
        </linearGradient>
        {/* Lo blanco se pinta, lo negro se recorta: el círculo es la mordida. */}
        <mask id={mordida} maskUnits="userSpaceOnUse" x="-10" y="-10" width="80" height="72">
          <rect x="-10" y="-10" width="80" height="72" fill="#fff" />
          <circle cx="52" cy="6" r="8.6" fill="#000" />
        </mask>
      </defs>

      {lineas && <path d="M3 17h8M0 25h11M3 33h8" stroke={VERDE} strokeWidth="3" strokeLinecap="round" />}

      <g className="logo-vivo-icono" transform="rotate(-8 34 24)">
        <g mask={`url(#${mordida})`}>
          <rect x="17.5" y="7.5" width="40" height="40" rx="13" fill={MAZORCA} />
          <rect x="14" y="4" width="40" height="40" rx="13" fill={`url(#${degradado})`} />
        </g>
        <path d="M20 15q3-6 10-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        {/* Triángulo de play, corrido a la derecha para que el centro óptico
            coincida con el centro del cuadro. */}
        <path d="M29 15.5 42 24 29 32.5Z" fill="#fff" stroke="#fff" strokeWidth="3.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Cada letra con su giro y su altura: el nombre "rebota".
// Si el nombre cambia de largo, el ciclo se repite (ver el módulo abajo).
const REBOTE = [
  [-6, 0],
  [4, -3],
  [-3, 1],
  [5, -2],
  [-4, 1],
  [6, -3],
  [-3, 0],
  [4, -2],
];

// Línea pequeña bajo el nombre. 'corta' cabe en móvil junto a la barra, cosa
// que el tagline largo no hacía.
const LEYENDAS = {
  corta: 'Menú en video',
  tagline: 'Descubre antes de pedir',
};

/**
 * Logotipo completo: isotipo + nombre (+ leyenda opcional).
 * El nombre es texto real: el lector de pantalla lee "Antojate" de una vez y
 * las letras sueltas que rebotan quedan solo para la vista.
 *
 * @param {'corta'|'tagline'} [leyenda]  línea pequeña bajo el nombre
 */
export function LogoAntojate({ size = 'md', leyenda, className = '' }) {
  const medidas = {
    sm: { icono: 32, texto: 'text-lg', hueco: 'gap-2' },
    md: { icono: 40, texto: 'text-2xl', hueco: 'gap-2.5' },
    lg: { icono: 52, texto: 'text-3xl', hueco: 'gap-3' },
  }[size];

  return (
    <span className={`inline-flex items-center ${medidas.hueco} ${className}`}>
      <IsotipoAntojate size={medidas.icono} className="shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={`${medidas.texto} font-display font-extrabold text-cream`}>
          <span className="sr-only">Antojate</span>
          <span aria-hidden="true">
            {[...'Antojate'].map((letra, i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  transform: `translateY(${REBOTE[i % REBOTE.length][1]}px) rotate(${REBOTE[i % REBOTE.length][0]}deg)`,
                }}
              >
                {letra}
              </span>
            ))}
          </span>
        </span>
        {LEYENDAS[leyenda] && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-amber-soft">
            {LEYENDAS[leyenda]}
          </span>
        )}
      </span>
    </span>
  );
}
