import { Image } from 'expo-image';
import { ChefHat, Clapperboard, Flame, Play } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';
import { formatearPrecio } from '@/shared/utils/formato';

// Tarjeta de un plato: la miniatura de su video, el nombre, el restaurante y el
// precio. Solo datos que vienen de la carta; nada de calificaciones ni tiempos.
export const TarjetaPlato = memo(function TarjetaPlato({
  plato,
  onPress,
  ancho,
  ocultarRestaurante = false,
}: {
  plato: PlatoFeed;
  onPress: () => void;
  /** Ancho fijo (carrusel). Sin él, la tarjeta llena su columna. */
  ancho?: number;
  /** Dentro de la pantalla del restaurante su nombre sobra: va la categoría. */
  ocultarRestaurante?: boolean;
}) {
  const imagen = plato.video_thumbnail_url ?? plato.imagen_url;
  // Si la miniatura no existe o el CDN no la entrega, un ícono en vez de un hueco.
  const [falloImagen, setFalloImagen] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${plato.nombre}, ${plato.restaurante.nombre}, ${formatearPrecio(plato.precio)}. Ver en video`}
      style={({ pressed }) => [estilos.tarjeta, ancho ? { width: ancho } : estilos.columna, pressed ? estilos.presionada : null]}
    >
      <View style={estilos.marco}>
        {imagen && !falloImagen ? (
          <Image
            // El CDN de Bunny rechaza lo que llega sin Referer (ver api/config.ts).
            source={{ uri: imagen, headers: CABECERAS_MEDIOS }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            recyclingKey={String(plato.id)}
            onError={() => setFalloImagen(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={estilos.sinImagen}>
            <Clapperboard color={colores.textoSuave} size={32} strokeWidth={1.6} />
          </View>
        )}
        <View style={estilos.reproducir}>
          <Play color="#ffffff" fill="#ffffff" size={14} />
        </View>
        <View style={estilos.insignias}>
          {plato.recomendado_chef ? (
            <View style={[estilos.insignia, estilos.insigniaChef]}>
              <ChefHat color={colores.tinto} size={13} strokeWidth={2.4} />
              <Texto variante="pequeno" peso="negrita" style={estilos.textoChef}>
                Del chef
              </Texto>
            </View>
          ) : null}
          {plato.nivel_picante > 0 ? (
            <View style={estilos.insignia} accessibilityLabel={`Picante nivel ${plato.nivel_picante} de 3`}>
              {Array.from({ length: plato.nivel_picante }, (_, i) => (
                <Flame key={i} color="#ff8a5c" fill="#ff8a5c" size={12} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={estilos.info}>
        <Texto peso="seminegrita" numberOfLines={2} style={estilos.nombre}>
          {plato.nombre}
        </Texto>
        <Texto variante="pequeno" color="textoSuave" numberOfLines={1}>
          {ocultarRestaurante ? (plato.categoria ?? '') : plato.restaurante.nombre}
        </Texto>
        <Texto peso="negrita" color="marcaClara">
          {formatearPrecio(plato.precio)}
        </Texto>
      </View>
    </Pressable>
  );
});

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: radios.grande,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    overflow: 'hidden',
  },
  columna: { flex: 1 },
  presionada: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  marco: { aspectRatio: 4 / 5, backgroundColor: colores.superficieAlta },
  sinImagen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  reproducir: {
    position: 'absolute',
    right: espacio.s,
    bottom: espacio.s,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 16, 0.6)',
  },
  insignias: { position: 'absolute', left: espacio.s, top: espacio.s, gap: 6, alignItems: 'flex-start' },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radios.pildora,
    backgroundColor: 'rgba(14, 18, 16, 0.7)',
  },
  insigniaChef: { backgroundColor: colores.mazorca },
  textoChef: { color: colores.tinto, fontSize: 11, lineHeight: 14 },
  info: { padding: espacio.m, gap: 2 },
  nombre: { minHeight: 40, lineHeight: 20 },
});
