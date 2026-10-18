import { Text, type TextProps, type TextStyle } from 'react-native';
import { colores, fuentes, tamanos } from '@/shared/theme';

type Variante = 'portada' | 'titulo' | 'subtitulo' | 'destacado' | 'cuerpo' | 'pequeno';

const VARIANTES: Record<Variante, TextStyle> = {
  portada: { fontFamily: fuentes.titular, fontSize: tamanos.portada, lineHeight: 38 },
  titulo: { fontFamily: fuentes.titular, fontSize: tamanos.titulo, lineHeight: 32 },
  subtitulo: { fontFamily: fuentes.seminegrita, fontSize: tamanos.subtitulo, lineHeight: 26 },
  destacado: { fontFamily: fuentes.seminegrita, fontSize: tamanos.destacado, lineHeight: 24 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: tamanos.cuerpo, lineHeight: 22 },
  pequeno: { fontFamily: fuentes.regular, fontSize: tamanos.pequeno, lineHeight: 18 },
};

export interface TextoProps extends TextProps {
  variante?: Variante;
  color?: keyof typeof colores;
  peso?: keyof typeof fuentes;
}

// Todo texto de la app pasa por aquí: tipografía y color salen del tema, nunca
// de un valor suelto. Respeta el tamaño de letra del sistema, con tope para que
// una letra muy grande no rompa la pantalla.
export function Texto({ variante = 'cuerpo', color = 'texto', peso, style, ...props }: TextoProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[VARIANTES[variante], { color: colores[color] }, peso ? { fontFamily: fuentes[peso] } : null, style]}
      {...props}
    />
  );
}
