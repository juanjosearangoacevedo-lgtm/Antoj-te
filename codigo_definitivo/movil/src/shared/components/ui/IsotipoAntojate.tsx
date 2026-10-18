import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

// El isotipo de Antojate: un play (video) al que le falta una mordida, inclinado,
// con degradado verde, brillo y sombra amarilla de sticker. Es el mismo dibujo
// de la web (frontend/src/shared/components/marca/LogoAntojate.jsx), sin las
// líneas de velocidad ni el vaivén, que a tamaño de app solo estorban.
const VERDE_CLARO = '#3aa876';
const VERDE = '#1f8a5b';
const VERDE_HONDO = '#145c3c';
const MAZORCA = '#f6b931';

export function IsotipoAntojate({ tamano = 40 }: { tamano?: number }) {
  // Ids únicos por instancia: dos isotipos en la misma pantalla compartirían el
  // degradado y el segundo se quedaría sin relleno. Sin ':' (no valen en url(#…)).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const degradado = `antojate-degradado-${uid}`;
  const mordida = `antojate-mordida-${uid}`;

  return (
    <Svg width={tamano} height={tamano} viewBox="10 0 50 50" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <LinearGradient id={degradado} x1="14" y1="4" x2="54" y2="44" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={VERDE_CLARO} />
          <Stop offset="0.55" stopColor={VERDE} />
          <Stop offset="1" stopColor={VERDE_HONDO} />
        </LinearGradient>
        {/* Lo blanco se pinta, lo negro se recorta: el círculo es la mordida. */}
        <Mask id={mordida} maskUnits="userSpaceOnUse" x="-10" y="-10" width="80" height="72">
          <Rect x="-10" y="-10" width="80" height="72" fill="#fff" />
          <Circle cx="52" cy="6" r="8.6" fill="#000" />
        </Mask>
      </Defs>
      <G rotation={-8} origin="34, 24">
        <G mask={`url(#${mordida})`}>
          <Rect x="17.5" y="7.5" width="40" height="40" rx="13" fill={MAZORCA} />
          <Rect x="14" y="4" width="40" height="40" rx="13" fill={`url(#${degradado})`} />
        </G>
        <Path d="M20 15q3-6 10-7" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.45} fill="none" />
        <Path d="M29 15.5 42 24 29 32.5Z" fill="#fff" stroke="#fff" strokeWidth={3.4} strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
