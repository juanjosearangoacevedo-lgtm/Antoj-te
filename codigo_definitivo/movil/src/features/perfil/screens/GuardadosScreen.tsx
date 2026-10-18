import { useFocusEffect } from '@react-navigation/native';
import { Bookmark } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TarjetaPlato } from '@/features/descubrir/components/TarjetaPlato';
import { useGuardados } from '@/features/feed/hooks/useFeed';
import type { PropsRaiz } from '@/navigation/tipos';
import { Cargando, ErrorReintentar, Vacio } from '@/shared/components/estados';
import { Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio } from '@/shared/theme';

// Lo que la persona guardó para después. Sin cuenta son los de este teléfono;
// al entrar pasan a la cuenta y la siguen a cualquier teléfono (decisión D6).

export default function GuardadosScreen({ navigation }: PropsRaiz<'Guardados'>) {
  const { data, isPending, isError, refetch, isRefetching } = useGuardados();
  const conCuenta = useSesion((s) => s.estado === 'autenticado');
  const anchoColumna = (useWindowDimensions().width - espacio.xl * 2 - espacio.m) / 2;
  const platos = data?.items ?? [];

  // Al volver de un video donde se quitó un guardado, la lista se pone al día.
  // La primera vez no: al montar, React Query ya la está pidiendo.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      void refetch();
    }, [refetch])
  );

  let vacio;
  if (isPending) vacio = <Cargando />;
  else if (isError) vacio = <ErrorReintentar onReintentar={() => void refetch()} />;
  else
    vacio = (
      <Vacio
        icono={Bookmark}
        titulo="Todavía no guardas platos"
        descripcion="En cualquier video, toca Guardar y lo encuentras aquí después."
      />
    );

  return (
    <SafeAreaView edges={['bottom']} style={estilos.fondo}>
      <FlatList
        data={platos}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <TarjetaPlato
            plato={item}
            ancho={anchoColumna}
            onPress={() => navigation.navigate('Plato', { platoId: item.id, fuente: { tipo: 'guardados' } })}
          />
        )}
        columnWrapperStyle={estilos.columnas}
        ItemSeparatorComponent={Separador}
        ListHeaderComponent={
          platos.length && !conCuenta ? (
            <Texto variante="pequeno" color="textoSuave" style={estilos.nota}>
              Están guardados en este teléfono. Si creas una cuenta, te siguen a cualquier otro.
            </Texto>
          ) : null
        }
        ListEmptyComponent={<View style={estilos.vacio}>{vacio}</View>}
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isPending}
            onRefresh={() => void refetch()}
            tintColor={colores.marcaClara}
            colors={[colores.marca]}
            progressBackgroundColor={colores.superficie}
          />
        }
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
  contenido: { paddingTop: espacio.m, paddingBottom: espacio.xl, flexGrow: 1 },
  columnas: { gap: espacio.m, paddingHorizontal: espacio.xl },
  nota: { paddingHorizontal: espacio.xl, paddingBottom: espacio.m },
  vacio: { flex: 1, minHeight: 320, paddingHorizontal: espacio.xl },
});
