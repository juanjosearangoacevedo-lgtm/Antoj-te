import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colores, espacio, TOQUE_MINIMO } from '@/shared/theme';

export interface PantallaProps {
  children: ReactNode;
  /** Con formularios o contenido largo. */
  desplazable?: boolean;
  /** Bordes seguros que respeta. Una pantalla con cabecera de navegación no necesita el de arriba. */
  bordes?: Edge[];
  /** false = sin el margen interior, para piezas que van de borde a borde (la portada del acceso). */
  relleno?: boolean;
  /**
   * Espacio extra al final del contenido. Las pestañas lo usan para que la barra
   * flotante (que va encima del contenido) no tape lo último de la pantalla.
   */
  espacioInferior?: number;
}

// Contenedor base de toda pantalla: fondo del tema, zonas seguras (la muesca, la
// barra de gestos) y, con formularios, que el teclado no tape el campo activo.
//
// El teclado lo resuelve react-native-keyboard-controller, no el
// KeyboardAvoidingView de React Native. Desde el SDK 54, Android dibuja la app de
// borde a borde y la ventana ya no se encoge al abrir el teclado; el de React
// Native calcula mal el espacio en ese caso. Comprobado en el emulador: el último
// campo de un formulario quedaba debajo del teclado, y en "Borrar tu cuenta" un
// toque al botón caía sobre una tecla. Este componente desplaza el campo con
// foco hasta dejarlo a la vista, igual en iOS y en Android.
//
// Deja además a la vista lo que va justo debajo del campo (su ayuda, su error o
// el botón que lo envía): con solo el campo, el botón de "Borrar mi cuenta"
// quedaba partido por el borde del teclado.
const ESPACIO_SOBRE_TECLADO = TOQUE_MINIMO + espacio.l * 2;

export function Pantalla({
  children,
  desplazable = false,
  bordes = ['top', 'left', 'right'],
  relleno = true,
  espacioInferior = 0,
}: PantallaProps) {
  const contenido = [relleno ? estilos.contenido : estilos.sinRelleno, espacioInferior ? { paddingBottom: espacioInferior } : null];

  return (
    <SafeAreaView edges={bordes} style={estilos.fondo}>
      {desplazable ? (
        <KeyboardAwareScrollView
          bottomOffset={ESPACIO_SOBRE_TECLADO}
          contentContainerStyle={contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={estilos.fondo}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[estilos.fondo, ...contenido]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, padding: espacio.xl, gap: espacio.l },
  sinRelleno: { flexGrow: 1 },
});
