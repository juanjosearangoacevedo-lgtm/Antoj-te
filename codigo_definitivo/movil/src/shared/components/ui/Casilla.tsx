import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colores, espacio, TOQUE_MINIMO } from '@/shared/theme';
import { Texto } from './Texto';

// Casilla de verificación. Toda la fila es tocable, no solo el cuadrito.
export function Casilla({
  marcada,
  onCambiar,
  children,
  error,
}: {
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  children: ReactNode;
  error?: string | null;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        onPress={() => onCambiar(!marcada)}
        style={estilos.fila}
      >
        <View style={[estilos.cuadro, marcada ? estilos.cuadroMarcado : null, error ? { borderColor: colores.peligro } : null]}>
          {marcada ? <Check color={colores.textoSobreMarca} size={16} strokeWidth={3} /> : null}
        </View>
        <Texto variante="pequeno" color="textoSuave" style={{ flex: 1 }}>
          {children}
        </Texto>
      </Pressable>
      {error ? (
        <Texto variante="pequeno" color="peligro">
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: TOQUE_MINIMO },
  cuadro: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colores.textoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadroMarcado: { backgroundColor: colores.marca, borderColor: colores.marca },
});
