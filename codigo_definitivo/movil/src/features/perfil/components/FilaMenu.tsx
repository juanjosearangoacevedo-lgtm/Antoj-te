import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { Texto } from '@/shared/components/ui';
import { colores, espacio, radios, TOQUE_MINIMO } from '@/shared/theme';

// Una opción del perfil: icono, texto y flecha. Toda la fila es tocable.
export function FilaMenu({
  icono: Icono,
  titulo,
  onPress,
  peligro = false,
}: {
  icono: LucideIcon;
  titulo: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  const tinta = peligro ? colores.peligro : colores.texto;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed ? { backgroundColor: colores.superficieAlta } : null]}
    >
      <Icono color={tinta} size={20} />
      <Texto style={[estilos.titulo, { color: tinta }]}>{titulo}</Texto>
      {peligro ? null : <ChevronRight color={colores.textoSuave} size={18} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: TOQUE_MINIMO + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.l,
    borderRadius: radios.boton,
    backgroundColor: colores.superficie,
  },
  titulo: { flex: 1 },
});
