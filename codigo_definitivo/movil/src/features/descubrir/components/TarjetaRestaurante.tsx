import { Image } from 'expo-image';
import { Clapperboard, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import type { RestauranteFeed } from '@/shared/api/esquemas';
import { Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';

// Tarjeta de un restaurante publicado. Los restaurantes todavía no tienen foto
// de portada, así que la cabecera es un mosaico con las miniaturas de sus propios
// platos (las manda el backend): imágenes reales de su carta, no de un banco de fotos.
export function TarjetaRestaurante({
  restaurante,
  activo,
  onPress,
}: {
  restaurante: RestauranteFeed;
  /** Ya está filtrando el inicio por este restaurante. */
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={`${restaurante.nombre}${restaurante.ciudad ? `, ${restaurante.ciudad}` : ''}. ${restaurante.total} platos en video`}
      accessibilityHint={activo ? 'Deja de filtrar por este restaurante' : 'Muestra solo sus platos'}
      style={({ pressed }) => [estilos.tarjeta, activo ? estilos.activa : null, pressed ? estilos.presionada : null]}
    >
      <View style={estilos.mosaico}>
        {restaurante.miniaturas.map((uri, i) => (
          <Image
            key={uri}
            source={{ uri, headers: CABECERAS_MEDIOS }}
            style={[estilos.pieza, i === 0 ? estilos.piezaGrande : null]}
            contentFit="cover"
            transition={180}
          />
        ))}
      </View>
      <View style={estilos.info}>
        <Texto variante="destacado" numberOfLines={1}>
          {restaurante.nombre}
        </Texto>
        {restaurante.descripcion ? (
          <Texto variante="pequeno" color="textoSuave" numberOfLines={2}>
            {restaurante.descripcion}
          </Texto>
        ) : null}
        <View style={estilos.datos}>
          {restaurante.ciudad ? (
            <View style={estilos.dato}>
              <MapPin color={colores.textoSuave} size={14} />
              <Texto variante="pequeno" color="textoSuave">
                {restaurante.ciudad}
              </Texto>
            </View>
          ) : null}
          <View style={estilos.dato}>
            <Clapperboard color={colores.marcaClara} size={14} />
            <Texto variante="pequeno" color="marcaClara" peso="seminegrita">
              {restaurante.total} {restaurante.total === 1 ? 'plato en video' : 'platos en video'}
            </Texto>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    width: 280,
    borderRadius: radios.grande,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    overflow: 'hidden',
  },
  activa: { borderColor: colores.marcaClara, borderWidth: 2 },
  presionada: { transform: [{ scale: 0.98 }] },
  mosaico: { height: 120, flexDirection: 'row', gap: 2, backgroundColor: colores.superficieAlta },
  pieza: { flex: 1, height: '100%' },
  piezaGrande: { flex: 2 },
  info: { padding: espacio.m, gap: espacio.xs },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m, marginTop: espacio.xs },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
