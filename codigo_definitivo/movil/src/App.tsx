// Cada peso por su ruta, no desde la raíz del paquete: la raíz arrastra todos
// los pesos al paquete de la app, y se usan cinco. Baloo 2 en titulares y
// Nunito Sans en textos, como la web.
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_500Medium } from '@expo-google-fonts/nunito-sans/500Medium';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { NavigationContainer } from '@react-navigation/native';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from './navigation/linking';
import RaizNavegador from './navigation/RaizNavegador';
import { temaNavegacion } from './navigation/tema';
import { claves } from './features/feed/cache';
import { crearClienteConsultas } from './shared/api/consultas';
import { enviarEventosAlSalir } from './shared/api/eventos';
import { VerificadorVersion } from './shared/components/VerificadorVersion';
import { useSesion } from './shared/state/sesion';
// Se importa por su efecto: engancha la solicitud de acceso a los cambios de sesión.
import './shared/state/solicitudAcceso';

// La pantalla de carga nativa se queda hasta que la tipografía está lista: así
// no hay un parpadeo de letra del sistema antes de la de la marca.
SplashScreen.preventAutoHideAsync().catch(() => {});

const clienteConsultas = crearClienteConsultas();

// React Query vuelve a pedir lo que esté viejo cuando la app regresa al primer
// plano (lo que en la web hace el foco de la pestaña).
function useReconsultarAlVolver() {
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      focusManager.setFocused(estado === 'active');
    });
    return () => suscripcion.remove();
  }, []);
}

// El feed responde distinto con cuenta y sin ella: "me gusta" y guardados son de
// la cuenta o del teléfono, y al entrar los del teléfono pasan a la cuenta. Así
// que al entrar o salir se vuelve a pedir, y los comentarios (que dicen cuáles
// son tuyos y esconden a quien bloqueaste) se olvidan.
function useFeedSegunSesion() {
  useEffect(
    () =>
      useSesion.subscribe((sesion, anterior) => {
        const conCuenta = sesion.estado === 'autenticado';
        if (conCuenta === (anterior.estado === 'autenticado')) return;
        void clienteConsultas.invalidateQueries({ queryKey: claves.todo });
        clienteConsultas.removeQueries({ queryKey: ['comentarios'] });
      }),
    []
  );
}

export default function App() {
  const [fuentesListas, errorFuentes] = useFonts({
    Baloo2_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  useReconsultarAlVolver();
  useFeedSegunSesion();
  // Las señales del feed salen al pasar la app a segundo plano.
  useEffect(() => enviarEventosAlSalir(), []);

  // La sesión se restaura en paralelo y NO bloquea la entrada: explorar no la
  // necesita, y la red del teléfono puede tardar.
  useEffect(() => {
    useSesion.getState().restaurar();
  }, []);

  // Si la fuente falla, se sigue con la del sistema antes que dejar la app colgada.
  const listo = fuentesListas || Boolean(errorFuentes);
  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  if (!listo) return null;

  return (
    <SafeAreaProvider>
      {/* Mide el teclado para que ningún campo quede tapado (ver ui/Pantalla.tsx). */}
      <KeyboardProvider>
        <QueryClientProvider client={clienteConsultas}>
          <VerificadorVersion>
            <NavigationContainer theme={temaNavegacion} linking={linking}>
              <StatusBar style="light" />
              <RaizNavegador />
            </NavigationContainer>
          </VerificadorVersion>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
