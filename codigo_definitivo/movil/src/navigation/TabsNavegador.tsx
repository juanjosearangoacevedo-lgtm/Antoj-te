import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, Search, UserRound } from 'lucide-react-native';
import BuscarScreen from '@/features/descubrir/screens/BuscarScreen';
import InicioScreen from '@/features/feed/screens/InicioScreen';
import PerfilScreen from '@/features/perfil/screens/PerfilScreen';
import { BarraFlotante } from './BarraFlotante';
import type { TabsParamList } from './tipos';

const Tabs = createBottomTabNavigator<TabsParamList>();

// Inicio (el feed), Buscar (antojos, filtros, intención) y Perfil. Nada más: el
// brief pide una barra extremadamente simple, alcanzable con el pulgar. La barra
// es flotante (ver BarraFlotante.tsx) y cada pestaña le reserva su espacio.
export default function TabsNavegador() {
  return (
    <Tabs.Navigator tabBar={(props) => <BarraFlotante {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="Inicio"
        component={InicioScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="Buscar"
        component={BuscarScreen}
        options={{ tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs.Navigator>
  );
}
