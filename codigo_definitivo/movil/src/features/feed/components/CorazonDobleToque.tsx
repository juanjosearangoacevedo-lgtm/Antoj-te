import { Heart } from 'lucide-react-native';
import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// El corazón grande que aparece en el centro al dar doble toque al video. Solo
// se ve: el "me gusta" de verdad lo hace quien lo dispara. Con "reducir
// movimiento" aparece y se va sin saltar.

export interface CorazonRef {
  latir: () => void;
}

export const CorazonDobleToque = forwardRef<CorazonRef>(function CorazonDobleToque(_props, ref) {
  const escala = useSharedValue(0);
  const opacidad = useSharedValue(0);
  const reducido = useReducedMotion();

  useImperativeHandle(ref, () => ({
    latir() {
      if (reducido) {
        escala.value = 1;
        opacidad.value = withSequence(withTiming(1, { duration: 80 }), withDelay(400, withTiming(0, { duration: 200 })));
        return;
      }
      escala.value = withSequence(
        withTiming(0.4, { duration: 0 }),
        withSpring(1.15, { damping: 9, stiffness: 220, reduceMotion: ReduceMotion.System }),
        withDelay(260, withTiming(1.35, { duration: 200 }))
      );
      opacidad.value = withSequence(withTiming(1, { duration: 60 }), withDelay(420, withTiming(0, { duration: 200 })));
    },
  }));

  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value, transform: [{ scale: escala.value }] }));

  return (
    <Animated.View style={[estilos.centro, estilo]} pointerEvents="none">
      <Heart color="#ff4d6d" fill="#ff4d6d" size={110} strokeWidth={1.5} />
    </Animated.View>
  );
});

const estilos = StyleSheet.create({
  centro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
