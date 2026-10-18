import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, movimiento, radios } from '@/shared/theme';

// La hoja que sube desde abajo sobre todo lo demás: la base de las hojas de la
// app (los antojos, la ficha del plato, las opciones de un comentario). Tocar
// fuera o el botón atrás de Android la cierran.
//
// Dos cosas del Modal de Android, vistas en el emulador:
// - Es otra ventana, así que el área segura se mide de nuevo aquí dentro. Con la
//   de afuera llegaba 0 abajo, y lo último de la hoja quedaba detrás de la barra
//   de navegación.
// - Se dibuja primero sin las barras del sistema y un instante después a
//   pantalla completa. Por eso la hoja sube con un desplazamiento y no con una
//   animación de entrada (`entering`) de Reanimated: esa se queda con la
//   posición del primer dibujo, y la hoja terminaba flotando por encima del
//   borde, con la pantalla de atrás asomando por debajo.

export interface HojaInferiorProps {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
  /** Lo que anuncia el lector de pantalla para el fondo, que cierra la hoja. */
  etiquetaCerrar?: string;
  altoMaximo?: DimensionValue;
  estilo?: StyleProp<ViewStyle>;
}

export function HojaInferior({ visible, onCerrar, ...resto }: HojaInferiorProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <Contenido onCerrar={onCerrar} {...resto} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Contenido({ onCerrar, children, etiquetaCerrar = 'Cerrar', altoMaximo, estilo }: Omit<HojaInferiorProps, 'visible'>) {
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Se monta cada vez que la hoja se abre, así que sube cada vez.
  const desplazamiento = useSharedValue(height);
  useEffect(() => {
    desplazamiento.value = withTiming(0, {
      duration: movimiento.lento,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [desplazamiento]);
  const subir = useAnimatedStyle(() => ({ transform: [{ translateY: desplazamiento.value }] }));

  return (
    <View style={estilos.velo}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityRole="button" accessibilityLabel={etiquetaCerrar} />
      <Animated.View
        style={[estilos.hoja, altoMaximo !== undefined ? { maxHeight: altoMaximo } : null, estilo, { paddingBottom: bottom + espacio.l }, subir]}
      >
        <View style={estilos.asa} />
        {children}
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: colores.velo },
  hoja: {
    borderTopLeftRadius: radios.enorme,
    borderTopRightRadius: radios.enorme,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.linea,
    paddingTop: espacio.s,
  },
  asa: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colores.linea },
});
