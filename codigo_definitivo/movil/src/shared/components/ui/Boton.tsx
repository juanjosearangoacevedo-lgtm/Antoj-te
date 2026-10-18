import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colores, espacio, radios, TOQUE_MINIMO } from '@/shared/theme';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

const FONDO: Record<Variante, ViewStyle> = {
  primario: { backgroundColor: colores.marca },
  secundario: { backgroundColor: colores.superficieAlta, borderWidth: 1, borderColor: colores.linea },
  fantasma: { backgroundColor: 'transparent' },
  peligro: { backgroundColor: colores.peligroTenue },
};

// Sobre el verde de relleno (#1B7D52), texto blanco: 5,1:1, pasa el contraste AA.
const TINTA: Record<Variante, string> = {
  primario: colores.textoSobreMarca,
  secundario: colores.texto,
  fantasma: colores.marcaClara,
  peligro: colores.peligro,
};

export interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: LucideIcon;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Texto para lectores de pantalla, si el título solo no basta. */
  etiquetaAccesible?: string;
  style?: ViewStyle;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono: Icono,
  cargando = false,
  deshabilitado = false,
  etiquetaAccesible,
  style,
}: BotonProps) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        FONDO[variante],
        pressed && !inactivo ? estilos.presionado : null,
        inactivo ? estilos.inactivo : null,
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={TINTA[variante]} />
      ) : (
        <View style={estilos.contenido}>
          {Icono ? <Icono color={TINTA[variante]} size={18} strokeWidth={2.2} /> : null}
          <Texto peso="seminegrita" style={{ color: TINTA[variante] }}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: TOQUE_MINIMO,
    borderRadius: radios.boton,
    paddingHorizontal: espacio.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  presionado: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  inactivo: { opacity: 0.5 },
});
