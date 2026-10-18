import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MascotaAntojate, type MascotaProps } from './MascotaAntojate';

// La mascota flotando suave, arriba y abajo: es el único movimiento continuo de
// la app, para la portada del acceso y el banner del inicio. Con "reducir
// movimiento" activado en el teléfono se queda quieta.
export function MascotaFlotante(props: MascotaProps) {
  const reducir = useReducedMotion();
  const desplazamiento = useSharedValue(0);

  useEffect(() => {
    if (reducir) return;
    desplazamiento.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [reducir, desplazamiento]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: desplazamiento.value }] }));

  return (
    <Animated.View style={estilo}>
      <MascotaAntojate {...props} />
    </Animated.View>
  );
}
