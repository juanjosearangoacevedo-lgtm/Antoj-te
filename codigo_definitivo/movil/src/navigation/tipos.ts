import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Todas las rutas de la app y sus parámetros. Navegar a una ruta que no existe,
// o con parámetros equivocados, es un error de compilación.

// La barra inferior: solo tres, a propósito (el brief lo pide así).
export type TabsParamList = {
  Inicio: undefined;
  Buscar: undefined;
  Perfil: undefined;
};

// De qué lista viene un plato abierto a pantalla completa: por ella se desliza.
//   feed       el feed con esos antojos (el inicio, los recomendados del chef,
//              un restaurante: todo es el feed con algún antojo).
//   guardados  lo que la persona guardó.
//   plato      un plato suelto (un enlace).
export type FuenteFeed = { tipo: 'feed'; antojos: string[] } | { tipo: 'guardados' } | { tipo: 'plato' };

export type RaizParamList = {
  Principal: NavigatorScreenParams<TabsParamList> | undefined;
  // Entrar o registrarse. `motivo` explica por qué se pide la cuenta ("Para
  // confirmar tu reserva necesitas crear una cuenta").
  Acceso: { motivo?: string; modo?: 'entrar' | 'registro' } | undefined;
  // `desdeAcceso`: al terminar hay que cerrar también la pantalla de acceso.
  Recuperar: { email?: string; desdeAcceso?: boolean } | undefined;
  VerificarCorreo: undefined;
  Cuenta: undefined;
  // El video de un plato a pantalla completa, deslizando por la lista de la que
  // se vino (la que ya está en caché: no se pide otra vez).
  Plato: { platoId: number; fuente: FuenteFeed };
  Comentarios: { platoId: number };
  // Un restaurante y sus platos. `nombre` llega para pintar el título antes de
  // tener los datos.
  Restaurante: { slug: string; nombre?: string };
  Guardados: undefined;
  // Solo en desarrollo: la prueba del video de Bunny con Referer.
  DiagnosticoVideo: undefined;
};

export type PropsRaiz<Ruta extends keyof RaizParamList> = NativeStackScreenProps<RaizParamList, Ruta>;

export type PropsTab<Ruta extends keyof TabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, Ruta>,
  NativeStackScreenProps<RaizParamList>
>;

// Tipado global para useNavigation() sin genéricos en cada pantalla.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RaizParamList {}
  }
}
