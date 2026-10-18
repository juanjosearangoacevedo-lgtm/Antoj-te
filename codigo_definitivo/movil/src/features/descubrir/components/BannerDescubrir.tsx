import { ArrowDown } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { FondoMarca, MascotaFlotante, Texto } from '@/shared/components/ui';
import { colores, espacio, radios, TOQUE_MINIMO } from '@/shared/theme';

// Banner principal del inicio: la mascota, la promesa de la marca y un llamado a
// explorar. Las cifras son las reales del catálogo; sin promociones ni
// descuentos, porque hoy no existen.
export function BannerDescubrir({
  totalPlatos,
  totalRestaurantes,
  onExplorar,
}: {
  totalPlatos: number;
  totalRestaurantes: number;
  onExplorar: () => void;
}) {
  return (
    <View style={estilos.banner}>
      <FondoMarca />
      <View style={estilos.texto}>
        <Texto variante="pequeno" peso="negrita" style={estilos.antetitulo}>
          MENÚ EN VIDEO
        </Texto>
        <Texto variante="titulo" style={estilos.titulo}>
          Mira el plato antes de pedirlo
        </Texto>
        {totalPlatos > 0 ? (
          <Texto variante="pequeno" peso="media" style={estilos.cifras}>
            {totalPlatos} platos en video de {totalRestaurantes} {totalRestaurantes === 1 ? 'restaurante' : 'restaurantes'}
          </Texto>
        ) : null}
        <Pressable
          onPress={onExplorar}
          accessibilityRole="button"
          accessibilityLabel="Explorar platos"
          style={({ pressed }) => [estilos.accion, pressed ? estilos.presionada : null]}
        >
          <Texto peso="negrita" style={estilos.textoAccion}>
            Explorar platos
          </Texto>
          <ArrowDown color={colores.verdeHondo} size={16} strokeWidth={2.6} />
        </Pressable>
      </View>
      <View style={estilos.mascota} pointerEvents="none">
        <MascotaFlotante expresion="recomendando" tamano={124} sobreVerde />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: {
    borderRadius: radios.enorme,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacio.xl,
    paddingRight: espacio.s,
    minHeight: 190,
  },
  texto: { flex: 1, gap: espacio.s, alignItems: 'flex-start' },
  antetitulo: { color: 'rgba(255,255,255,0.85)', letterSpacing: 1.6, fontSize: 11 },
  titulo: { color: '#ffffff', fontSize: 24, lineHeight: 28 },
  cifras: { color: 'rgba(255,255,255,0.92)' },
  accion: {
    marginTop: espacio.xs,
    minHeight: TOQUE_MINIMO - 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacio.l,
    borderRadius: radios.pildora,
    backgroundColor: '#ffffff',
  },
  presionada: { transform: [{ scale: 0.97 }] },
  textoAccion: { color: colores.verdeHondo },
  mascota: { width: 124, alignItems: 'center' },
});
