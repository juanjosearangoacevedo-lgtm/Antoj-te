import { SearchX, Store, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { BannerDescubrir } from '@/features/descubrir/components/BannerDescubrir';
import { BotonAntojate } from '@/features/descubrir/components/BotonAntojate';
import { CarruselCategorias } from '@/features/descubrir/components/CarruselCategorias';
import { FiltrosActivos } from '@/features/descubrir/components/FiltrosActivos';
import { HojaAntojate } from '@/features/descubrir/components/HojaAntojate';
import { TarjetaPlato } from '@/features/descubrir/components/TarjetaPlato';
import { TarjetaRestaurante } from '@/features/descubrir/components/TarjetaRestaurante';
import { construirGrupos, opcionesElegibles, seleccionVigente } from '@/features/descubrir/logica/antojos';
import { useAntojos } from '@/features/descubrir/state/antojos';
import { useEspacioBarra } from '@/navigation/BarraFlotante';
import type { PropsTab } from '@/navigation/tipos';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { Cargando, ErrorReintentar, Vacio } from '@/shared/components/estados';
import { Boton, IsotipoAntojate, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio, fuentes } from '@/shared/theme';
import { useActualizarFeed, useFeed, useOpcionesFeed } from '../hooks/useFeed';

// Pestaña Inicio: descubrir platos y restaurantes. Es la puerta del feed: la
// cuadrícula de abajo es el feed paginado (con los antojos activos) y tocar un
// plato lo abre a pantalla completa para seguir deslizando por esa misma lista.
//
// Todo sale del backend (GET /app/v1/feed y /feed/opciones): los restaurantes
// publicados, sus platos y lo que la hoja ANTOJATE puede ofrecer.

const SOLO_CHEF = ['chef'];

export default function InicioScreen({ navigation }: PropsTab<'Inicio'>) {
  const opciones = useOpcionesFeed();
  const seleccion = useAntojos((s) => s.seleccion);
  const { alternar, quitar, limpiar, aplicar } = useAntojos(
    useShallow((s) => ({ alternar: s.alternar, quitar: s.quitar, limpiar: s.limpiar, aplicar: s.aplicar }))
  );
  const comensal = useSesion((s) => s.comensal);
  const espacioBarra = useEspacioBarra();
  const { actualizando, actualizar } = useActualizarFeed();
  // Ancho fijo por columna: con un número impar de platos, el último quedaría
  // solo en su fila y se estiraría a todo el ancho.
  const anchoColumna = (useWindowDimensions().width - espacio.xl * 2 - espacio.m) / 2;
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const lista = useRef<FlatList<PlatoFeed>>(null);
  const posicionResultados = useRef(0);

  useEffect(() => {
    useAntojos.getState().cargar();
  }, []);

  const datos = opciones.data;
  const grupos = useMemo(() => (datos ? construirGrupos(datos) : []), [datos]);
  const elegibles = useMemo(() => opcionesElegibles(grupos, datos?.restaurantes ?? []), [grupos, datos]);
  // Lo guardado que ya no existe (una categoría borrada) no cuenta.
  const activos = useMemo(() => (datos ? seleccionVigente(seleccion, elegibles) : seleccion), [datos, seleccion, elegibles]);
  const filtrando = activos.length > 0;

  // El feed espera a las opciones: sin ellas no se sabe qué antojos guardados
  // siguen existiendo, y se pediría dos veces.
  const feed = useFeed(activos, { habilitado: !opciones.isPending });
  const delChef = useFeed(SOLO_CHEF, { habilitado: !filtrando && (datos?.chef ?? 0) > 0 });

  // Baja hasta el título de los resultados. Se mide en el momento (onLayout del
  // título) porque la cabecera cambia de alto al aplicar o quitar antojos.
  const irAResultados = useCallback(() => {
    lista.current?.scrollToOffset({ offset: Math.max(posicionResultados.current - espacio.m, 0), animated: true });
  }, []);
  const bajarAlAplicar = useRef(false);
  const pedirBajada = useCallback(() => {
    bajarAlAplicar.current = true;
    // Si la cabecera no cambió de alto, onLayout no llega: se baja igual.
    setTimeout(() => {
      if (!bajarAlAplicar.current) return;
      bajarAlAplicar.current = false;
      irAResultados();
    }, 400);
  }, [irAResultados]);

  const abrirPlato = useCallback(
    (plato: PlatoFeed, antojos: string[]) => navigation.navigate('Plato', { platoId: plato.id, fuente: { tipo: 'feed', antojos } }),
    [navigation]
  );

  const nombre = comensal?.nombre.trim().split(/\s+/)[0];

  const cabecera = (
    <View style={estilos.cabecera}>
      <View style={[estilos.relleno, estilos.barraSuperior]}>
        <View style={estilos.marca}>
          <IsotipoAntojate tamano={30} />
          <Texto style={estilos.nombreMarca}>Antojate</Texto>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          accessibilityRole="button"
          accessibilityLabel={comensal ? `Tu perfil, ${comensal.nombre}` : 'Tu perfil'}
          style={estilos.avatar}
        >
          {comensal ? (
            <Texto peso="negrita" style={{ color: colores.textoSobreMarca }}>
              {comensal.nombre.trim().charAt(0).toUpperCase()}
            </Texto>
          ) : (
            <UserRound color={colores.textoSobreMarca} size={20} />
          )}
        </Pressable>
      </View>

      <View style={[estilos.relleno, estilos.saludo]}>
        <Texto color="textoSuave">{nombre ? `Hola, ${nombre}` : 'Hola'}</Texto>
        <Texto variante="titulo">¿Qué se te antoja hoy?</Texto>
      </View>

      <View style={estilos.relleno}>
        <BannerDescubrir
          totalPlatos={datos?.total_platos ?? 0}
          totalRestaurantes={datos?.total_restaurantes ?? 0}
          onExplorar={irAResultados}
        />
      </View>

      <View style={estilos.relleno}>
        <BotonAntojate activos={activos.length} onPress={() => setHojaAbierta(true)} />
      </View>

      <FiltrosActivos seleccion={activos} etiquetas={elegibles} onQuitar={quitar} onLimpiar={limpiar} />

      {datos?.categorias.length ? (
        <View style={estilos.seccion}>
          <Texto variante="subtitulo" style={estilos.relleno}>
            Categorías
          </Texto>
          <CarruselCategorias
            categorias={datos.categorias}
            seleccion={activos}
            onAlternar={alternar}
            onTodo={() => aplicar(activos.filter((id) => !id.startsWith('categoria:')))}
          />
        </View>
      ) : null}

      {!filtrando && datos?.restaurantes.length ? (
        <View style={estilos.seccion}>
          <Texto variante="subtitulo" style={estilos.relleno}>
            Restaurantes en Antojate
          </Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carrusel}>
            {datos.restaurantes.map((r) => (
              <TarjetaRestaurante
                key={r.slug}
                restaurante={r}
                activo={activos.includes(`restaurante:${r.slug}`)}
                onPress={() => {
                  pedirBajada();
                  alternar(`restaurante:${r.slug}`);
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {!filtrando && delChef.platos.length ? (
        <View style={estilos.seccion}>
          <Texto variante="subtitulo" style={estilos.relleno}>
            Recomendados del chef
          </Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carrusel}>
            {delChef.platos.map((p) => (
              <TarjetaPlato key={p.id} plato={p} ancho={176} onPress={() => abrirPlato(p, SOLO_CHEF)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {feed.platos.length ? (
        <View
          style={[estilos.relleno, estilos.tituloResultados]}
          onLayout={(e) => {
            posicionResultados.current = e.nativeEvent.layout.y;
            // Recién aplicados los antojos: bajar cuando la cabecera ya tomó su
            // nuevo alto, no antes (si no, se baja a donde estaba el título).
            if (bajarAlAplicar.current) {
              bajarAlAplicar.current = false;
              requestAnimationFrame(irAResultados);
            }
          }}
        >
          <Texto variante="subtitulo">{filtrando ? 'Para tu antojo' : 'Todos los platos'}</Texto>
          <Texto variante="pequeno" color="textoSuave">
            {feed.total} {feed.total === 1 ? 'plato' : 'platos'}
          </Texto>
        </View>
      ) : null}
    </View>
  );

  let vacio: ReactElement;
  if (opciones.isPending || feed.cargando) vacio = <Cargando texto="Buscando platos…" />;
  else if ((opciones.isError && !datos) || feed.error) vacio = <ErrorReintentar onReintentar={() => void actualizar()} />;
  else if (!datos?.total_platos)
    vacio = (
      <Vacio
        icono={Store}
        titulo="Todavía no hay restaurantes publicados"
        descripcion="Cuando un restaurante publique su carta en video, aparecerá aquí."
      />
    );
  else
    vacio = (
      <Vacio
        icono={SearchX}
        titulo="Nada con esa combinación"
        descripcion="Prueba quitando algún antojo o elige otros."
        accion={{ titulo: 'Limpiar antojos', onPress: limpiar }}
      />
    );

  const pie = feed.cargandoMas ? (
    <ActivityIndicator color={colores.marca} style={estilos.pie} />
  ) : feed.errorAlCargarMas ? (
    <View style={[estilos.relleno, estilos.pie]}>
      <Boton titulo="Cargar más platos" variante="secundario" onPress={feed.cargarMas} />
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top']} style={estilos.fondo}>
      <FlatList
        ref={lista}
        data={feed.platos}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        renderItem={({ item }) => <TarjetaPlato plato={item} ancho={anchoColumna} onPress={() => abrirPlato(item, activos)} />}
        columnWrapperStyle={estilos.columnas}
        ItemSeparatorComponent={Separador}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<View style={estilos.vacio}>{vacio}</View>}
        ListFooterComponent={pie}
        // El feed sigue mientras se baja: la página siguiente se pide antes del final.
        onEndReached={feed.cargarMas}
        onEndReachedThreshold={0.6}
        contentContainerStyle={{ paddingBottom: espacioBarra }}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            tintColor={colores.marcaClara}
            colors={[colores.marca]}
            progressBackgroundColor={colores.superficie}
          />
        }
        initialNumToRender={6}
        showsVerticalScrollIndicator={false}
      />
      <HojaAntojate
        visible={hojaAbierta}
        grupos={grupos}
        seleccion={activos}
        onCerrar={() => setHojaAbierta(false)}
        onAplicar={(nueva) => {
          pedirBajada();
          aplicar(nueva);
          setHojaAbierta(false);
        }}
      />
    </SafeAreaView>
  );
}

// Espacio entre filas de la cuadrícula de platos.
function Separador() {
  return <View style={{ height: espacio.m }} />;
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { gap: espacio.xl, paddingTop: espacio.m, paddingBottom: espacio.s },
  relleno: { paddingHorizontal: espacio.xl },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  nombreMarca: { fontFamily: fuentes.titular, fontSize: 22, lineHeight: 26 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
  },
  saludo: { gap: 2, marginTop: -espacio.s },
  seccion: { gap: espacio.m },
  carrusel: { gap: espacio.m, paddingHorizontal: espacio.xl },
  tituloResultados: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  columnas: { gap: espacio.m, paddingHorizontal: espacio.xl },
  vacio: { minHeight: 280, paddingHorizontal: espacio.xl },
  pie: { marginTop: espacio.l },
});
