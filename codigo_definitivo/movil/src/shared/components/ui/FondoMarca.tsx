import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colores } from '@/shared/theme';

// Fondo verde de marca para las piezas grandes (la portada del acceso y el
// banner del inicio). Va en SVG porque la app no trae un paquete de degradados y
// no hace falta uno para esto. Se pinta detrás del contenido, a todo el tamaño de
// su contenedor.
//
// El degradado empieza en el verde de relleno (#1B7D52) y no en el cilantro puro:
// el texto blanco va encima, y con el cilantro (#1F8A5B) daría 4,3:1, por debajo
// de AA. El verde claro solo aparece en el halo de la derecha, donde va la
// mascota y no hay texto.
export function FondoMarca() {
  // Ids únicos: dos fondos en la misma pantalla compartirían el degradado.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const degradado = `fondo-marca-${uid}`;

  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100" pointerEvents="none">
      <Defs>
        <LinearGradient id={degradado} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colores.marca} />
          <Stop offset="0.6" stopColor="#17704a" />
          <Stop offset="1" stopColor={colores.verdeHondo} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${degradado})`} />
      <Circle cx="86" cy="42" r="34" fill={colores.verdeClaro} opacity={0.35} />
      <Circle cx="92" cy="8" r="20" fill="#ffffff" opacity={0.06} />
      <Circle cx="6" cy="102" r="24" fill={colores.mazorca} opacity={0.1} />
    </Svg>
  );
}
