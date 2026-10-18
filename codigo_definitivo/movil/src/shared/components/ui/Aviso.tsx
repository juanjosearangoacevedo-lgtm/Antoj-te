import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colores, espacio, radios } from '@/shared/theme';
import { Texto } from './Texto';

type Tipo = 'info' | 'error' | 'exito';

const ESTILO: Record<Tipo, { fondo: string; tinta: string; Icono: typeof Info }> = {
  info: { fondo: colores.marcaTenue, tinta: colores.marcaClara, Icono: Info },
  error: { fondo: colores.peligroTenue, tinta: colores.peligro, Icono: CircleAlert },
  exito: { fondo: colores.exitoTenue, tinta: colores.exito, Icono: CircleCheck },
};

// Mensaje en línea (no un popup): se queda visible hasta que deja de aplicar, y
// los lectores de pantalla lo anuncian al aparecer.
export function Aviso({ tipo = 'info', children }: { tipo?: Tipo; children: string }) {
  const { fondo, tinta, Icono } = ESTILO[tipo];
  return (
    <View
      style={[estilos.caja, { backgroundColor: fondo }]}
      accessibilityRole={tipo === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Icono color={tinta} size={18} />
      <Texto variante="pequeno" style={[estilos.texto, { color: tinta }]}>
        {children}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.s,
    padding: espacio.m,
    borderRadius: radios.boton,
  },
  texto: { flex: 1 },
});
