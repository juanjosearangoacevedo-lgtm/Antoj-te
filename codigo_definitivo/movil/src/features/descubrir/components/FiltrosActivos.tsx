import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Chip, Texto } from '@/shared/components/ui';
import { espacio } from '@/shared/theme';

// Los antojos que están filtrando el inicio, para quitarlos de a uno o todos de
// una vez. Siempre a la vista mientras haya alguno: nadie debería preguntarse por
// qué ve menos platos.
export function FiltrosActivos({
  seleccion,
  etiquetas,
  onQuitar,
  onLimpiar,
}: {
  seleccion: string[];
  etiquetas: Map<string, string>;
  onQuitar: (id: string) => void;
  onLimpiar: () => void;
}) {
  if (!seleccion.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.fila}>
      {seleccion.map((id) => (
        <Chip key={id} etiqueta={etiquetas.get(id) ?? id} activo quitable onPress={() => onQuitar(id)} />
      ))}
      <Pressable onPress={onLimpiar} accessibilityRole="button" hitSlop={8} style={estilos.limpiar}>
        <Texto variante="pequeno" peso="seminegrita" color="marcaClara">
          Limpiar todo
        </Texto>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fila: { gap: espacio.s, paddingHorizontal: espacio.xl, alignItems: 'center' },
  limpiar: { paddingHorizontal: espacio.s, minHeight: 40, justifyContent: 'center' },
});
