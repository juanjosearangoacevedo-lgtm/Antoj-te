import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';

// Barra inferior flotante: una cápsula separada de los bordes, con sombra, que va
// ENCIMA del contenido. Como no ocupa espacio en el diseño, cada pestaña reserva
// al final de su contenido lo que mide la barra (useEspacioBarra), para que nada
// quede tapado. Se esconde mientras el teclado está abierto.

const ALTO_BARRA = 66;

/** Distancia de la barra al borde inferior: la zona segura (la barra de gestos) o un mínimo. */
function separacion(abajo: number): number {
  return Math.max(abajo, espacio.m) + espacio.s;
}

/** Espacio que una pestaña debe dejar al final de su contenido para que la barra no lo tape. */
export function useEspacioBarra(): number {
  const { bottom } = useSafeAreaInsets();
  return separacion(bottom) + ALTO_BARRA + espacio.l;
}

function useTecladoAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    // En iOS "will" llega antes de que el teclado se mueva; Android solo tiene "did".
    const mostrar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setAbierto(true)
    );
    const ocultar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setAbierto(false)
    );
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return abierto;
}

export function BarraFlotante({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const tecladoAbierto = useTecladoAbierto();
  if (tecladoAbierto) return null;

  return (
    <View style={[estilos.contenedor, { bottom: separacion(bottom) }]} pointerEvents="box-none">
      <View style={estilos.barra} accessibilityRole="tablist">
        {state.routes.map((ruta, indice) => {
          const descriptor = descriptors[ruta.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const activo = state.index === indice;
          const etiqueta = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? ruta.name);
          const color = activo ? colores.marcaClara : colores.textoSuave;

          // El mismo protocolo que la barra estándar: se avisa del toque y, si
          // nadie lo canceló, se navega. Tocar la pestaña activa no hace nada.
          const alPresionar = () => {
            const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
            if (!activo && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
          };

          return (
            <Pressable
              key={ruta.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={etiqueta}
              onPress={alPresionar}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: ruta.key })}
              style={estilos.boton}
            >
              <View style={[estilos.pildora, activo ? estilos.pildoraActiva : null]}>
                {options.tabBarIcon?.({ focused: activo, color, size: 22 })}
              </View>
              <Texto variante="pequeno" peso={activo ? 'seminegrita' : 'media'} style={[estilos.etiqueta, { color }]}>
                {etiqueta}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { position: 'absolute', left: espacio.l, right: espacio.l },
  barra: {
    height: ALTO_BARRA,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacio.s,
    borderRadius: radios.enorme,
    backgroundColor: colores.superficieAlta,
    borderWidth: 1,
    borderColor: colores.linea,
    // Profundidad: sombra en iOS, elevación en Android.
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  boton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  pildora: { width: 56, height: 30, borderRadius: radios.pildora, alignItems: 'center', justifyContent: 'center' },
  pildoraActiva: { backgroundColor: colores.marcaTenue },
  etiqueta: { fontSize: 11, lineHeight: 14 },
});
