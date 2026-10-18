import { Image } from 'expo-image';
import { Clapperboard, MapPin, Store } from 'lucide-react-native';
import { useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TarjetaPlato } from '@/features/descubrir/components/TarjetaPlato';
import { useFeed, useOpcionesFeed } from '@/features/feed/hooks/useFeed';
import type { PropsRaiz } from '@/navigation/tipos';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import { Boton, Texto } from '@/shared/components/ui';
import { Cargando, ErrorReintentar, Vacio } from '@/shared/components/estados';
import { colores, espacio, radios } from '@/shared/theme';

// Un restaurante y sus platos en video. Por ahora es lo que ya existe en los
// datos (nombre, ciudad, descripción, logo y la carta); el perfil completo
// (horario, "abierto ahora", cómo llegar, reservar) llega en la fase 4.
//
// Sus platos son el feed con el antojo de este restaurante: tocar uno abre el
// video y se desliza solo por su carta.

export default function RestauranteScreen({ route, navigation }: PropsRaiz<'Restaurante'>) {
  const { slug } = route.params;
  const antojos = useMemo(() => [`restaurante:${slug}`], [slug]);
  const lista = useFeed(antojos);
  const opciones = useOpcionesFeed();
  const anchoColumna = (useWindowDimensions().width - espacio.xl * 2 - espacio.m) / 2;

  const delCatalogo = opciones.data?.restaurantes.find((r) => r.slug === slug);
  const delPlato = lista.platos[0]?.restaurante;
  const nombre = delCatalogo?.nombre ?? delPlato?.nombre ?? route.params.nombre ?? '';
  const ciudad = delCatalogo?.ciudad ?? delPlato?.ciudad ?? null;
  const logo = delCatalogo?.logo ?? delPlato?.logo ?? null;

  useLayoutEffect(() => {
    if (nombre) navigation.setOptions({ title: nombre });
  }, [navigation, nombre]);

  const cabecera = (
    <View style={estilos.cabecera}>
      <View style={estilos.identidad}>
        <View style={estilos.logo}>
          {logo ? (
            <Image source={{ uri: logo, headers: CABECERAS_MEDIOS }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Store color={colores.textoSobreMarca} size={30} />
          )}
        </View>
        <View style={estilos.titulos}>
          <Texto variante="titulo" numberOfLines={2}>
            {nombre}
          </Texto>
          {ciudad ? (
            <View style={estilos.dato}>
              <MapPin color={colores.textoSuave} size={14} />
              <Texto variante="pequeno" color="textoSuave">
                {ciudad}
              </Texto>
            </View>
          ) : null}
        </View>
      </View>
      {delCatalogo?.descripcion ? <Texto color="textoSuave">{delCatalogo.descripcion}</Texto> : null}
      {lista.total ? (
        <View style={estilos.dato}>
          <Clapperboard color={colores.marcaClara} size={16} />
          <Texto peso="seminegrita" color="marcaClara">
            {lista.total} {lista.total === 1 ? 'plato en video' : 'platos en video'}
          </Texto>
        </View>
      ) : null}
    </View>
  );

  let vacio;
  if (lista.cargando) vacio = <Cargando />;
  else if (lista.error) vacio = <ErrorReintentar onReintentar={lista.reintentar} />;
  else vacio = <Vacio icono={Clapperboard} titulo="Este restaurante no tiene platos en la app" descripcion="Puede que los esté actualizando." />;

  return (
    <SafeAreaView edges={['bottom']} style={estilos.fondo}>
      <FlatList
        data={lista.platos}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <TarjetaPlato
            plato={item}
            ancho={anchoColumna}
            ocultarRestaurante
            onPress={() => navigation.navigate('Plato', { platoId: item.id, fuente: { tipo: 'feed', antojos } })}
          />
        )}
        columnWrapperStyle={estilos.columnas}
        ItemSeparatorComponent={Separador}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<View style={estilos.vacio}>{vacio}</View>}
        ListFooterComponent={
          lista.cargandoMas ? (
            <ActivityIndicator color={colores.marca} style={estilos.mas} />
          ) : lista.errorAlCargarMas ? (
            <View style={estilos.mas}>
              <Boton titulo="Cargar más" variante="secundario" onPress={lista.cargarMas} />
            </View>
          ) : null
        }
        onEndReached={lista.cargarMas}
        onEndReachedThreshold={0.5}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function Separador() {
  return <View style={{ height: espacio.m }} />;
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingBottom: espacio.xl },
  cabecera: { gap: espacio.m, paddingHorizontal: espacio.xl, paddingTop: espacio.m, paddingBottom: espacio.l },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: espacio.l },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radios.grande,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
  },
  titulos: { flex: 1, gap: 2 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  columnas: { gap: espacio.m, paddingHorizontal: espacio.xl },
  vacio: { minHeight: 280, paddingHorizontal: espacio.xl },
  mas: { marginVertical: espacio.l, paddingHorizontal: espacio.xl },
});
