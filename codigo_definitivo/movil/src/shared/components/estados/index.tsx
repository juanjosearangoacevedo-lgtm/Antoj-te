import type { LucideIcon } from 'lucide-react-native';
import { RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MENSAJE_SIN_CONEXION } from '@/shared/api/errores';
import { colores, espacio } from '@/shared/theme';
import { Boton, Texto } from '../ui';

// Los estados que toda pantalla con datos remotos tiene que saber pintar:
// cargando, vacío y error con reintento. Nunca una pantalla en blanco.

export function Cargando({ texto }: { texto?: string }) {
  return (
    <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel={texto ?? 'Cargando'}>
      <ActivityIndicator color={colores.marca} size="large" />
      {texto ? (
        <Texto variante="pequeno" color="textoSuave">
          {texto}
        </Texto>
      ) : null}
    </View>
  );
}

export function Vacio({
  icono: Icono,
  titulo,
  descripcion,
  accion,
}: {
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: { titulo: string; onPress: () => void };
}) {
  return (
    <View style={estilos.centro}>
      {Icono ? <Icono color={colores.textoSuave} size={40} strokeWidth={1.6} /> : null}
      <Texto variante="destacado" style={estilos.textoCentrado}>
        {titulo}
      </Texto>
      {descripcion ? (
        <Texto color="textoSuave" style={estilos.textoCentrado}>
          {descripcion}
        </Texto>
      ) : null}
      {accion ? <Boton titulo={accion.titulo} onPress={accion.onPress} variante="secundario" /> : null}
    </View>
  );
}

export function ErrorReintentar({
  mensaje = MENSAJE_SIN_CONEXION,
  onReintentar,
  reintentando = false,
}: {
  mensaje?: string;
  onReintentar: () => void;
  reintentando?: boolean;
}) {
  return (
    <View style={estilos.centro}>
      <Texto color="textoSuave" style={estilos.textoCentrado} accessibilityRole="alert">
        {mensaje}
      </Texto>
      <Boton titulo="Reintentar" icono={RefreshCw} onPress={onReintentar} cargando={reintentando} variante="secundario" />
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.l, padding: espacio.xl },
  textoCentrado: { textAlign: 'center', maxWidth: 320 },
});
