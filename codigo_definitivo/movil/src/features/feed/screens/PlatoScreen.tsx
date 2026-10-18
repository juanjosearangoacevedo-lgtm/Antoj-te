import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChefHat, ChevronLeft, ChevronsUp, Flame, Play, Store, Volume2, VolumeX } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { PropsRaiz } from '@/navigation/tipos';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { registrarEvento } from '@/shared/api/eventos';
import { Cargando, ErrorReintentar, Vacio } from '@/shared/components/estados';
import { Boton, MascotaAntojate, Pantalla, Texto } from '@/shared/components/ui';
import { colores, espacio, fuentes, radios } from '@/shared/theme';
import { formatearPrecio } from '@/shared/utils/formato';
import { AccionesPlato } from '../components/AccionesPlato';
import { CorazonDobleToque, type CorazonRef } from '../components/CorazonDobleToque';
import { HojaDetalle } from '../components/HojaDetalle';
import { useFuentePlatos, type FuentePlatos } from '../hooks/useFuentePlatos';
import { useGuardar, useMeGusta } from '../hooks/useSocial';

// Los platos en formato vertical, como TikTok o Reels: cada uno ocupa la
// pantalla entera y se desliza hacia arriba para pasar al siguiente. La lista es
// la misma de la que se vino (el inicio con sus antojos, un restaurante, los
// guardados), en el mismo orden, y empieza en el plato que se tocó; cuando se
// acerca el final, pide la página siguiente sola.
//
// Un toque pausa; dos toques dan "me gusta". A la derecha, el restaurante y las
// acciones; abajo, el plato. El botón de volver queda siempre a la vista, quieto
// mientras se desliza: salir no exige esperar a nada.

type Pagina = { tipo: 'plato'; plato: PlatoFeed } | { tipo: 'cargando' } | { tipo: 'fin' };

export default function PlatoScreen({ route }: PropsRaiz<'Plato'>) {
  const { platoId, fuente } = route.params;
  const datos = useFuentePlatos(fuente, platoId);
  const inicio = datos.platos.findIndex((p) => p.id === platoId);

  if (inicio === -1) {
    let contenido;
    if (datos.cargando || datos.hayMas) contenido = <Cargando />;
    else if (datos.error) contenido = <ErrorReintentar onReintentar={datos.reintentar} />;
    else contenido = <Vacio titulo="Este plato ya no está en la app" descripcion="El restaurante lo quitó o lo cambió." />;
    return <Pantalla bordes={['top', 'bottom']}>{contenido}</Pantalla>;
  }
  return <Deslizador datos={datos} inicio={inicio} />;
}

// Señales del feed: una "vista" por plato y, al dejarlo, cuántos segundos
// estuvo en pantalla. Se cuenta solo con la pantalla al frente.
function useSenalesDeVista(platoId: number | undefined, contando: boolean) {
  const tramo = useRef<{ id: number; desde: number } | null>(null);
  const vistos = useRef(new Set<number>());

  useEffect(() => {
    if (platoId === undefined || !contando) return undefined;
    tramo.current = { id: platoId, desde: Date.now() };
    if (!vistos.current.has(platoId)) {
      vistos.current.add(platoId);
      registrarEvento({ tipo: 'vista', plato_id: platoId });
    }
    return () => {
      const t = tramo.current;
      tramo.current = null;
      if (!t) return;
      const segundos = Math.round((Date.now() - t.desde) / 1000);
      if (segundos >= 1) registrarEvento({ tipo: 'tiempo_visto', plato_id: t.id, valor: Math.min(segundos, 3600) });
    };
  }, [platoId, contando]);
}

function Deslizador({ datos, inicio }: { datos: FuentePlatos; inicio: number }) {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  const [alto, setAlto] = useState(0);
  const [visible, setVisible] = useState(inicio);
  const [silencio, setSilencio] = useState(true);
  const [pausado, setPausado] = useState(false);
  const [enFoco, setEnFoco] = useState(true);
  const [deslizo, setDeslizo] = useState(false);
  const [detalle, setDetalle] = useState<PlatoFeed | null>(null);
  const { mutate: cambiarMeGusta } = useMeGusta();
  const { mutate: cambiarGuardado } = useGuardar();

  const paginas = useMemo<Pagina[]>(
    () => [
      ...datos.platos.map((plato): Pagina => ({ tipo: 'plato', plato })),
      datos.hayMas ? { tipo: 'cargando' } : { tipo: 'fin' },
    ],
    [datos.platos, datos.hayMas]
  );
  const actual = paginas[visible];
  const platoVisible = actual?.tipo === 'plato' ? actual.plato : null;

  // Al salir de la pantalla (otra encima, la app en segundo plano) se pausa todo.
  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      return () => setEnFoco(false);
    }, [])
  );

  useEffect(() => {
    // Cada plato nuevo arranca reproduciéndose.
    setPausado(false);
    if (visible !== inicio) setDeslizo(true);
  }, [visible, inicio]);

  // La página siguiente se pide antes de llegar al final, para no esperar.
  const { hayMas, cargarMas } = datos;
  useEffect(() => {
    if (hayMas && visible >= datos.platos.length - 3) cargarMas();
  }, [visible, datos.platos.length, hayMas, cargarMas]);

  useSenalesDeVista(platoVisible?.id, enFoco && !detalle);

  // FlatList exige que esta función no cambie entre renders.
  const alCambiarVisible = useRef(({ viewableItems }: { viewableItems: ViewToken<Pagina>[] }) => {
    const primero = viewableItems[0];
    if (primero?.index != null) setVisible(primero.index);
  }).current;
  const configVisible = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // Acciones. Reciben el plato tal como está en la caché en ese momento, así que
  // "me gusta" y guardar alternan sobre el estado real, no sobre uno viejo.
  const alternarMeGusta = useCallback((p: PlatoFeed) => cambiarMeGusta({ platoId: p.id, valor: !p.social.me_gusta_yo }), [cambiarMeGusta]);
  const darMeGusta = useCallback(
    (p: PlatoFeed) => {
      // El doble toque solo marca; nunca desmarca (como en todas las apps de video).
      if (!p.social.me_gusta_yo) cambiarMeGusta({ platoId: p.id, valor: true });
    },
    [cambiarMeGusta]
  );
  const alternarGuardado = useCallback((p: PlatoFeed) => cambiarGuardado({ platoId: p.id, valor: !p.social.guardado_yo }), [cambiarGuardado]);
  const abrirComentarios = useCallback((p: PlatoFeed) => navigation.navigate('Comentarios', { platoId: p.id }), [navigation]);
  const abrirRestaurante = useCallback(
    (p: PlatoFeed) => {
      registrarEvento({ tipo: 'restaurante_abierto', plato_id: p.id });
      navigation.navigate('Restaurante', { slug: p.restaurante.slug, nombre: p.restaurante.nombre });
    },
    [navigation]
  );
  const compartir = useCallback(async (p: PlatoFeed) => {
    try {
      const r = await Share.share({ message: `${p.nombre} en ${p.restaurante.nombre}, en video: ${p.compartir_url}` });
      if (r.action === Share.sharedAction) registrarEvento({ tipo: 'compartido', plato_id: p.id });
    } catch {
      // Cerrar el diálogo de compartir no es un error que enseñar.
    }
  }, []);
  const abrirDetalle = useCallback((p: PlatoFeed) => {
    registrarEvento({ tipo: 'detalle_abierto', plato_id: p.id });
    setDetalle(p);
  }, []);
  const alternarPausa = useCallback(() => setPausado((x) => !x), []);
  const completo = useCallback((p: PlatoFeed) => registrarEvento({ tipo: 'video_completo', plato_id: p.id }), []);

  return (
    <View style={estilos.fondo} onLayout={(e) => setAlto(Math.round(e.nativeEvent.layout.height))}>
      {alto > 0 ? (
        <FlatList
          data={paginas}
          keyExtractor={(p) => (p.tipo === 'plato' ? `plato-${p.plato.id}` : p.tipo)}
          renderItem={({ item, index }) => {
            if (item.tipo === 'cargando') {
              return <PaginaCargando alto={alto} error={datos.errorAlCargarMas} onReintentar={cargarMas} />;
            }
            if (item.tipo === 'fin') return <FinDeLista alto={alto} onVolver={() => navigation.goBack()} />;
            const esVisible = index === visible;
            return (
              <VideoPlato
                plato={item.plato}
                alto={alto}
                activo={enFoco && esVisible}
                pausado={esVisible && pausado}
                silencio={silencio}
                onToque={alternarPausa}
                onDobleToque={darMeGusta}
                onMeGusta={alternarMeGusta}
                onGuardar={alternarGuardado}
                onComentarios={abrirComentarios}
                onRestaurante={abrirRestaurante}
                onCompartir={compartir}
                onDetalle={abrirDetalle}
                onCompleto={completo}
              />
            );
          }}
          // Una página por plato: el deslizamiento siempre termina en un plato entero,
          // y de a uno aunque el gesto sea rápido. Al soltar manda la velocidad del
          // dedo (hacia arriba, el siguiente); si el dedo ya se había detenido, el
          // plato más cercano. En el emulador la velocidad llega siempre en cero
          // (va tan lento que Android da el dedo por detenido): allí solo se pasa
          // arrastrando más de media pantalla. En un teléfono basta un gesto corto.
          snapToInterval={alto}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: alto, offset: alto * index, index })}
          initialScrollIndex={inicio}
          // Solo se montan el plato visible y sus vecinos; reproductor, uno solo.
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          onViewableItemsChanged={alCambiarVisible}
          viewabilityConfig={configVisible}
        />
      ) : null}

      {/* Volver: siempre a la vista y quieto, también mientras se desliza. Discreto
          para no tapar el video, con área de toque completa. */}
      <View style={[estilos.barra, { top: top + espacio.s }]} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={10}
          style={({ pressed }) => [estilos.botonRedondo, pressed ? estilos.presionado : null]}
        >
          <ChevronLeft color="#ffffff" size={24} />
        </Pressable>
        {platoVisible && datos.total > 1 ? (
          <View style={estilos.contador} accessibilityLabel={`Plato ${visible + 1} de ${datos.total}`}>
            <Texto variante="pequeno" peso="seminegrita" style={estilos.textoBlanco}>
              {visible + 1} de {datos.total}
            </Texto>
          </View>
        ) : null}
        {/* El sonido, solo sobre un plato: en la página final no hay video. */}
        {platoVisible ? (
          <Pressable
            onPress={() => setSilencio((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={silencio ? 'Activar sonido' : 'Silenciar'}
            hitSlop={10}
            style={({ pressed }) => [estilos.botonRedondo, pressed ? estilos.presionado : null]}
          >
            {silencio ? <VolumeX color="#ffffff" size={20} /> : <Volume2 color="#ffffff" size={20} />}
          </Pressable>
        ) : null}
      </View>

      {/* La pista de que se puede deslizar: hasta que se desliza la primera vez. */}
      {!deslizo && visible < datos.platos.length - 1 ? (
        <View style={[estilos.pista, { top: top + espacio.s + 52 }]} pointerEvents="none">
          <ChevronsUp color="#ffffff" size={16} />
          <Texto variante="pequeno" peso="seminegrita" style={estilos.textoBlanco}>
            Desliza hacia arriba para el siguiente
          </Texto>
        </View>
      ) : null}

      <HojaDetalle plato={detalle} onCerrar={() => setDetalle(null)} />
    </View>
  );
}

interface PropsVideo {
  plato: PlatoFeed;
  alto: number;
  activo: boolean;
  pausado: boolean;
  silencio: boolean;
  onToque: () => void;
  onDobleToque: (p: PlatoFeed) => void;
  onMeGusta: (p: PlatoFeed) => void;
  onGuardar: (p: PlatoFeed) => void;
  onComentarios: (p: PlatoFeed) => void;
  onRestaurante: (p: PlatoFeed) => void;
  onCompartir: (p: PlatoFeed) => void;
  onDetalle: (p: PlatoFeed) => void;
  onCompleto: (p: PlatoFeed) => void;
}

// Entre dos toques de un doble toque.
const DOBLE_TOQUE_MS = 280;
// Lo que puede moverse el dedo y durar un toque para seguir siendo un toque. Más
// que eso es un arrastre (deslizar al siguiente plato) o un toque largo.
const TOQUE_MAX_PX = 12;
const TOQUE_MAX_MS = 400;

const VideoPlato = memo(function VideoPlato({
  plato,
  alto,
  activo,
  pausado,
  silencio,
  onToque,
  onDobleToque,
  onMeGusta,
  onGuardar,
  onComentarios,
  onRestaurante,
  onCompartir,
  onDetalle,
  onCompleto,
}: PropsVideo) {
  const { bottom } = useSafeAreaInsets();
  const [errorVideo, setErrorVideo] = useState(false);
  const corazon = useRef<CorazonRef>(null);
  const ultimoToque = useRef(0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dedo = useRef<{ x: number; y: number; t: number } | null>(null);
  const miniatura = plato.video_thumbnail_url ?? plato.imagen_url;

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    []
  );

  // El toque se detecta a mano y no con un Pressable. Un Pressable que cubre la
  // pantalla entera da por bueno el toque aunque el dedo haya recorrido media
  // pantalla (nunca sale de su área), así que deslizar al plato siguiente
  // también pausaba el video. Aquí solo cuenta como toque si el dedo casi no se
  // movió y fue breve; lo demás es de la lista. Y esta capa no se adueña del
  // gesto (no es "responder"), así que no compite con el desplazamiento.
  //
  // Los tiempos salen del evento (cuándo tocó el dedo) y no del reloj al
  // atenderlo: si JavaScript va atrasado (un teléfono lento, un video cargando),
  // un toque corto parecería largo y dos toques separados, un doble toque.
  const alEmpezarToque = (e: GestureResponderEvent) => {
    dedo.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: e.nativeEvent.timestamp };
  };
  const alTerminarToque = (e: GestureResponderEvent) => {
    const inicio = dedo.current;
    dedo.current = null;
    if (!inicio) return;
    const recorrido = Math.hypot(e.nativeEvent.pageX - inicio.x, e.nativeEvent.pageY - inicio.y);
    if (recorrido > TOQUE_MAX_PX || e.nativeEvent.timestamp - inicio.t > TOQUE_MAX_MS) return;
    alTocar(e.nativeEvent.timestamp);
  };

  // Un toque pausa; dos seguidos dan "me gusta". Para distinguirlos, el primero
  // espera un instante por si llega el segundo.
  const alTocar = (cuando: number) => {
    if (cuando - ultimoToque.current < DOBLE_TOQUE_MS) {
      if (espera.current) clearTimeout(espera.current);
      espera.current = null;
      ultimoToque.current = 0;
      corazon.current?.latir();
      onDobleToque(plato);
      return;
    }
    ultimoToque.current = cuando;
    espera.current = setTimeout(() => {
      espera.current = null;
      onToque();
    }, DOBLE_TOQUE_MS);
  };

  const alFallar = useCallback(() => setErrorVideo(true), []);
  const alCompletar = useCallback(() => onCompleto(plato), [onCompleto, plato]);

  return (
    <View style={{ height: alto }}>
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={alEmpezarToque}
        onTouchEnd={alTerminarToque}
        onTouchCancel={() => {
          dedo.current = null;
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={pausado ? 'Reanudar el video' : 'Pausar el video'}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onToque();
        }}
      >
        {miniatura ? (
          <Image source={{ uri: miniatura, headers: CABECERAS_MEDIOS }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        {/* Un solo reproductor a la vez: el del plato visible. Los vecinos muestran
            su miniatura hasta que llegan a la pantalla. Con dos o tres videos
            cargados a la vez, Android cerraba la app por memoria (visto en el
            emulador); un teléfono de gama baja tendría el mismo problema. */}
        {activo && plato.video_url ? (
          <VideoActivo uri={plato.video_url} silencio={silencio} pausado={pausado} onError={alFallar} onCompleto={alCompletar} />
        ) : null}
      </View>

      {pausado ? (
        <View style={estilos.centro} pointerEvents="none">
          <View style={estilos.reanudar}>
            <Play color="#ffffff" fill="#ffffff" size={34} />
          </View>
        </View>
      ) : null}
      <CorazonDobleToque ref={corazon} />

      {/* Oscurece la parte de abajo para que el texto se lea sobre cualquier video. */}
      <Svg style={estilos.degradado} preserveAspectRatio="none" viewBox="0 0 1 1" pointerEvents="none">
        <Defs>
          <LinearGradient id={`velo-${plato.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#000000" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#velo-${plato.id})`} />
      </Svg>

      <View style={[estilos.info, { paddingBottom: bottom + espacio.xl }]} pointerEvents="box-none">
        {errorVideo ? (
          // No se culpa a la conexión: también falla cuando el video no existe en el CDN.
          <Texto variante="pequeno" style={estilos.aviso}>
            Este video no está disponible ahora.
          </Texto>
        ) : null}
        <View style={estilos.insignias} pointerEvents="none">
          {plato.categoria ? (
            <View style={estilos.insignia}>
              <Texto variante="pequeno" peso="seminegrita" style={estilos.textoBlanco}>
                {plato.categoria}
              </Texto>
            </View>
          ) : null}
          {plato.recomendado_chef ? (
            <View style={[estilos.insignia, estilos.insigniaChef]}>
              <ChefHat color={colores.tinto} size={14} strokeWidth={2.4} />
              <Texto variante="pequeno" peso="negrita" style={{ color: colores.tinto }}>
                Recomendado del chef
              </Texto>
            </View>
          ) : null}
          {plato.nivel_picante > 0 ? (
            <View style={estilos.insignia} accessibilityLabel={`Picante nivel ${plato.nivel_picante} de 3`}>
              {Array.from({ length: plato.nivel_picante }, (_, i) => (
                <Flame key={i} color="#ff8a5c" fill="#ff8a5c" size={13} />
              ))}
            </View>
          ) : null}
        </View>
        <Pressable onPress={() => onDetalle(plato)} accessibilityRole="button" accessibilityHint="Abre la descripción y los ingredientes">
          <Texto style={estilos.nombre}>{plato.nombre}</Texto>
        </Pressable>
        <Pressable
          onPress={() => onRestaurante(plato)}
          accessibilityRole="button"
          accessibilityLabel={`${plato.restaurante.nombre}. Ver el restaurante`}
          style={estilos.restaurante}
          hitSlop={6}
        >
          <Store color="rgba(255,255,255,0.85)" size={15} />
          <Texto variante="pequeno" peso="seminegrita" style={estilos.textoSuaveClaro}>
            {plato.restaurante.nombre}
            {plato.restaurante.ciudad ? ` · ${plato.restaurante.ciudad}` : ''}
          </Texto>
        </Pressable>
        {plato.descripcion ? (
          <Pressable onPress={() => onDetalle(plato)} accessibilityRole="button" accessibilityLabel="Ver la descripción completa y los ingredientes">
            <Texto style={estilos.descripcion} numberOfLines={2}>
              {plato.descripcion}
            </Texto>
            <Texto variante="pequeno" peso="seminegrita" style={estilos.mas}>
              Ver más
            </Texto>
          </Pressable>
        ) : null}
        <View style={estilos.precio}>
          <Texto peso="negrita" style={{ color: colores.verdeHondo }}>
            {formatearPrecio(plato.precio)}
          </Texto>
        </View>
      </View>

      <View style={[estilos.acciones, { bottom: bottom + espacio.xl + 8 }]}>
        <AccionesPlato
          plato={plato}
          onRestaurante={() => onRestaurante(plato)}
          onMeGusta={() => onMeGusta(plato)}
          onComentarios={() => onComentarios(plato)}
          onGuardar={() => onGuardar(plato)}
          onCompartir={() => onCompartir(plato)}
        />
      </View>
    </View>
  );
});

// El reproductor del plato visible. Existe solo mientras el plato está a la
// vista: al deslizar se desmonta y libera la memoria del video.
function VideoActivo({
  uri,
  silencio,
  pausado,
  onError,
  onCompleto,
}: {
  uri: string;
  silencio: boolean;
  pausado: boolean;
  onError: () => void;
  onCompleto: () => void;
}) {
  const reproductor = useVideoPlayer({ uri, headers: CABECERAS_MEDIOS }, (p) => {
    p.loop = true;
    p.muted = true;
    // Poco búfer por delante: los videos son de segundos y la memoria es poca.
    p.bufferOptions = { preferredForwardBufferDuration: 6 };
    // Para notar la primera vuelta completa (ver abajo).
    p.timeUpdateEventInterval = 0.5;
    p.play();
  });
  const { status } = useEvent(reproductor, 'statusChange', { status: reproductor.status });

  useEffect(() => {
    reproductor.muted = silencio;
  }, [silencio, reproductor]);

  useEffect(() => {
    if (pausado) reproductor.pause();
    else reproductor.play();
  }, [pausado, reproductor]);

  useEffect(() => {
    if (status === 'error') onError();
  }, [status, onError]);

  // El video va en bucle, así que no hay un "terminó": se nota la primera vuelta
  // completa porque el tiempo salta hacia atrás.
  const anterior = useRef(0);
  const vuelta = useRef(false);
  useEventListener(reproductor, 'timeUpdate', ({ currentTime }) => {
    if (!vuelta.current && currentTime + 1 < anterior.current) {
      vuelta.current = true;
      onCompleto();
    }
    anterior.current = currentTime;
  });

  // El video solo se ve: no recibe toques. En Android, el VideoView de expo-video
  // se queda con TODOS los toques que caen encima (su onTouchEvent devuelve true y
  // los reenvía a JS a mano), y con eso la lista nunca recibía el arrastre: no se
  // podía deslizar al plato siguiente y el gesto terminaba como un toque (pausa).
  // Con la capa en "none", los toques van al Pressable de la página y el arrastre
  // a la lista, como en cualquier otra pantalla.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView player={reproductor} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
    </View>
  );
}

function PaginaCargando({ alto, error, onReintentar }: { alto: number; error: boolean; onReintentar: () => void }) {
  return (
    <View style={[{ height: alto }, estilos.pagina]}>
      {error ? (
        <>
          <Texto color="textoSuave" style={estilos.textoCentrado}>
            No pudimos cargar más platos.
          </Texto>
          <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
        </>
      ) : (
        <ActivityIndicator color={colores.marcaClara} size="large" />
      )}
    </View>
  );
}

// El final de la lista: en vez de un video que no se mueve, se dice que no hay
// más y se ofrece volver.
function FinDeLista({ alto, onVolver }: { alto: number; onVolver: () => void }) {
  return (
    <View style={[{ height: alto }, estilos.pagina]}>
      <MascotaAntojate expresion="celebrando" tamano={110} />
      <Texto variante="titulo" style={estilos.textoCentrado}>
        Eso es todo por ahora
      </Texto>
      <Texto color="textoSuave" style={estilos.textoCentrado}>
        Ya viste todos los platos de esta lista.
      </Texto>
      <Boton titulo="Volver" onPress={onVolver} style={estilos.volver} />
    </View>
  );
}

const sombraTexto = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#000000' },
  degradado: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  centro: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  reanudar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  barra: {
    position: 'absolute',
    left: espacio.l,
    right: espacio.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Discreto: tenue sobre el video, pero con 40 px de botón y margen de toque.
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  presionado: { opacity: 0.7, transform: [{ scale: 0.92 }] },
  contador: {
    paddingHorizontal: espacio.m,
    paddingVertical: 6,
    borderRadius: radios.pildora,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pista: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacio.m,
    paddingVertical: 6,
    borderRadius: radios.pildora,
    backgroundColor: 'rgba(27,125,82,0.85)',
  },
  // A la izquierda de la columna de acciones, que va a la derecha.
  info: { position: 'absolute', left: 0, right: 76, bottom: 0, paddingLeft: espacio.xl, gap: espacio.s },
  acciones: { position: 'absolute', right: espacio.s },
  aviso: { color: '#ffd7c9' },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radios.pildora,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  insigniaChef: { backgroundColor: colores.mazorca },
  textoBlanco: { color: '#ffffff' },
  nombre: { fontFamily: fuentes.titular, fontSize: 30, lineHeight: 34, color: '#ffffff', ...sombraTexto },
  restaurante: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  textoSuaveClaro: { color: 'rgba(255,255,255,0.88)', ...sombraTexto },
  descripcion: { color: 'rgba(255,255,255,0.92)', ...sombraTexto },
  mas: { color: '#ffffff', marginTop: 2, ...sombraTexto },
  precio: {
    alignSelf: 'flex-start',
    marginTop: espacio.xs,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s,
    borderRadius: radios.pildora,
    backgroundColor: '#ffffff',
  },
  pagina: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.l,
    paddingHorizontal: espacio.xxl,
    backgroundColor: colores.fondo,
  },
  textoCentrado: { textAlign: 'center' },
  volver: { alignSelf: 'stretch', marginTop: espacio.s },
});
