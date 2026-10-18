import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccesoScreen from '@/features/auth/screens/AccesoScreen';
import RecuperarScreen from '@/features/auth/screens/RecuperarScreen';
import VerificarCorreoScreen from '@/features/auth/screens/VerificarCorreoScreen';
import DiagnosticoVideoScreen from '@/features/diagnostico/screens/DiagnosticoVideoScreen';
import ComentariosScreen from '@/features/feed/screens/ComentariosScreen';
import PlatoScreen from '@/features/feed/screens/PlatoScreen';
import CuentaScreen from '@/features/perfil/screens/CuentaScreen';
import GuardadosScreen from '@/features/perfil/screens/GuardadosScreen';
import RestauranteScreen from '@/features/restaurante/screens/RestauranteScreen';
import { colores, fuentes } from '@/shared/theme';
import TabsNavegador from './TabsNavegador';
import type { RaizParamList } from './tipos';

const Pila = createNativeStackNavigator<RaizParamList>();

// La pila raíz: las pestañas abajo y, encima, lo que se abre desde cualquier
// parte. El acceso va como modal: se abre sobre lo que la persona estaba
// haciendo (una reserva a medias) y, al cerrarse, eso sigue ahí.
export default function RaizNavegador() {
  return (
    <Pila.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontFamily: fuentes.seminegrita },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Pila.Screen name="Principal" component={TabsNavegador} options={{ headerShown: false }} />
      <Pila.Screen name="Cuenta" component={CuentaScreen} options={{ title: 'Tu cuenta' }} />
      {/* El video del plato a pantalla completa: sin cabecera, sube desde abajo. */}
      <Pila.Screen
        name="Plato"
        component={PlatoScreen}
        options={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: '#000000' } }}
      />
      <Pila.Screen name="Restaurante" component={RestauranteScreen} options={({ route }) => ({ title: route.params.nombre ?? '' })} />
      <Pila.Screen name="Guardados" component={GuardadosScreen} options={{ title: 'Guardados' }} />
      <Pila.Group screenOptions={{ presentation: 'modal' }}>
        {/* Los comentarios suben sobre el video; al cerrarlos, el video sigue donde estaba. */}
        <Pila.Screen name="Comentarios" component={ComentariosScreen} options={{ title: 'Comentarios' }} />
        {/* El acceso tiene su propia portada de marca, con su botón de cerrar. */}
        <Pila.Screen name="Acceso" component={AccesoScreen} options={{ headerShown: false }} />
        <Pila.Screen name="Recuperar" component={RecuperarScreen} options={{ title: 'Recuperar contraseña' }} />
        <Pila.Screen name="VerificarCorreo" component={VerificarCorreoScreen} options={{ title: 'Confirma tu correo' }} />
      </Pila.Group>
      {__DEV__ ? (
        <Pila.Screen name="DiagnosticoVideo" component={DiagnosticoVideoScreen} options={{ title: 'Prueba de video' }} />
      ) : null}
    </Pila.Navigator>
  );
}
