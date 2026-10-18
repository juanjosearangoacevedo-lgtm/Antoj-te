import { MessageCircle, MoreHorizontal, SendHorizontal } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExigirCuenta } from '@/features/auth/hooks/useExigirCuenta';
import type { PropsRaiz } from '@/navigation/tipos';
import { mensajeDeError } from '@/shared/api/errores';
import type { Comentario } from '@/shared/api/esquemas';
import type { MotivoReporte } from '@/shared/api/social';
import { Cargando, ErrorReintentar, Vacio } from '@/shared/components/estados';
import { Boton, HojaInferior, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio, fuentes, radios, tamanos } from '@/shared/theme';
import { haceCuanto } from '@/shared/utils/formato';
import { useBloquear, useComentar, useComentarios, useEliminarComentario, useReportar } from '../hooks/useSocial';

// Los comentarios de un plato. Leerlos no exige cuenta; escribir, reportar y
// bloquear sí (decisión D6): sin identidad no se puede bloquear a quien abusa, y
// las tiendas exigen las dos cosas para tener contenido de usuarios (App Store 1.2).

const MOTIVOS: { motivo: MotivoReporte; etiqueta: string }[] = [
  { motivo: 'ofensivo', etiqueta: 'Es ofensivo o de mal gusto' },
  { motivo: 'acoso', etiqueta: 'Acosa o ataca a alguien' },
  { motivo: 'spam', etiqueta: 'Es spam o publicidad' },
  { motivo: 'falso', etiqueta: 'Es falso o engañoso' },
  { motivo: 'otro', etiqueta: 'Otro motivo' },
];

const MAX_CARACTERES = 500;

export default function ComentariosScreen({ route, navigation }: PropsRaiz<'Comentarios'>) {
  const { platoId } = route.params;
  const { bottom } = useSafeAreaInsets();
  const consulta = useComentarios(platoId);
  const conCuenta = useSesion((s) => s.estado === 'autenticado');
  const exigirCuenta = useExigirCuenta();
  const comentar = useComentar(platoId);
  const eliminar = useEliminarComentario(platoId);
  const reportar = useReportar(platoId);
  const bloquear = useBloquear();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<Comentario | null>(null);
  const [reportando, setReportando] = useState(false);

  const total = consulta.data?.pages[0]?.total ?? 0;
  useLayoutEffect(() => {
    navigation.setOptions({ title: total ? `Comentarios (${total})` : 'Comentarios' });
  }, [navigation, total]);

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio || comentar.isPending) return;
    setError(null);
    try {
      await comentar.mutateAsync(limpio);
      setTexto('');
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const cerrarOpciones = () => {
    setElegido(null);
    setReportando(false);
  };

  // Reportar y bloquear exigen cuenta: se pide aquí, con el motivo a la vista.
  const conCuentaPara = async (motivo: string) => exigirCuenta({ motivo });

  const pedirBorrar = (c: Comentario) => {
    cerrarOpciones();
    Alert.alert('Borrar comentario', 'Se borra para siempre.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => eliminar.mutate(c.id, { onError: (err) => Alert.alert('No se pudo borrar', mensajeDeError(err)) }),
      },
    ]);
  };

  const pedirBloqueo = async (c: Comentario) => {
    cerrarOpciones();
    if (!(await conCuentaPara('Para bloquear a alguien necesitas una cuenta.'))) return;
    Alert.alert(`Bloquear a ${c.autor.nombre}`, 'Dejarás de ver sus comentarios en todos los platos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: () =>
          bloquear.mutate(c.id, {
            onSuccess: () => Alert.alert('Listo', 'Ya no verás sus comentarios en ningún plato.'),
            onError: (err) => Alert.alert('No se pudo bloquear', mensajeDeError(err)),
          }),
      },
    ]);
  };

  const elegirMotivo = async (motivo: MotivoReporte) => {
    const c = elegido;
    cerrarOpciones();
    if (!c) return;
    if (!(await conCuentaPara('Para reportar un comentario necesitas una cuenta.'))) return;
    reportar.mutate(
      { comentarioId: c.id, motivo },
      {
        onSuccess: () => Alert.alert('Gracias por avisarnos', 'El restaurante lo revisará. Ya no verás este comentario.'),
        onError: (err) => Alert.alert('No se pudo reportar', mensajeDeError(err)),
      }
    );
  };

  let cuerpo;
  if (consulta.isPending) cuerpo = <Cargando />;
  else if (consulta.isError && !consulta.comentarios.length) cuerpo = <ErrorReintentar onReintentar={() => void consulta.refetch()} />;
  else
    cuerpo = (
      <FlatList
        data={consulta.comentarios}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <FilaComentario comentario={item} onOpciones={() => setElegido(item)} />}
        contentContainerStyle={[estilos.lista, { paddingBottom: 96 + bottom }]}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Vacio
              icono={MessageCircle}
              titulo="Todavía no hay comentarios"
              descripcion="Cuéntales a los demás qué te pareció este plato."
            />
          </View>
        }
        onEndReached={() => {
          if (consulta.hasNextPage && !consulta.isFetchingNextPage) void consulta.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={consulta.isFetchingNextPage ? <ActivityIndicator color={colores.marca} style={estilos.mas} /> : null}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    );

  return (
    <View style={estilos.fondo}>
      {cuerpo}

      {/* La caja de escribir sube con el teclado (ver ui/Pantalla.tsx: el
          KeyboardAvoidingView de React Native falla con Android de borde a borde). */}
      <KeyboardStickyView offset={{ closed: 0, opened: bottom }} style={estilos.pie}>
        <View style={[estilos.caja, { paddingBottom: Math.max(bottom, espacio.m) }]}>
          {conCuenta ? (
            <>
              {error ? (
                <Texto variante="pequeno" style={estilos.error} accessibilityRole="alert">
                  {error}
                </Texto>
              ) : null}
              <View style={estilos.fila}>
                <TextInput
                  value={texto}
                  onChangeText={(t) => {
                    setTexto(t);
                    if (error) setError(null);
                  }}
                  placeholder="Escribe un comentario…"
                  placeholderTextColor={colores.textoSuave}
                  selectionColor={colores.marca}
                  cursorColor={colores.marca}
                  multiline
                  maxLength={MAX_CARACTERES}
                  maxFontSizeMultiplier={1.6}
                  accessibilityLabel="Tu comentario"
                  style={estilos.entrada}
                />
                <Pressable
                  onPress={() => void enviar()}
                  disabled={!texto.trim() || comentar.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Publicar comentario"
                  accessibilityState={{ disabled: !texto.trim() || comentar.isPending, busy: comentar.isPending }}
                  style={[estilos.enviar, !texto.trim() || comentar.isPending ? estilos.enviarInactivo : null]}
                >
                  {comentar.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <SendHorizontal color="#ffffff" size={20} />
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <Boton
              titulo="Entra para comentar"
              onPress={() => void exigirCuenta({ motivo: 'Para comentar necesitas una cuenta. Leer los comentarios no la pide.' })}
            />
          )}
        </View>
      </KeyboardStickyView>

      <HojaOpciones
        comentario={elegido}
        reportando={reportando}
        onReportar={() => setReportando(true)}
        onMotivo={(m) => void elegirMotivo(m)}
        onBloquear={() => elegido && void pedirBloqueo(elegido)}
        onBorrar={() => elegido && pedirBorrar(elegido)}
        onCerrar={cerrarOpciones}
      />
    </View>
  );
}

function FilaComentario({ comentario, onOpciones }: { comentario: Comentario; onOpciones: () => void }) {
  return (
    <Pressable onLongPress={onOpciones} style={estilos.comentario} accessibilityHint="Mantén presionado para ver opciones">
      <View style={estilos.avatar}>
        <Texto peso="negrita" style={{ color: colores.textoSobreMarca }}>
          {comentario.autor.nombre.charAt(0).toUpperCase()}
        </Texto>
      </View>
      <View style={estilos.cuerpoComentario}>
        <Texto variante="pequeno" color="textoSuave">
          <Texto variante="pequeno" peso="seminegrita">
            {comentario.mio ? 'Tú' : comentario.autor.nombre}
          </Texto>
          {`  ·  ${haceCuanto(comentario.hace_segundos)}`}
        </Texto>
        <Texto>{comentario.texto}</Texto>
      </View>
      <Pressable
        onPress={onOpciones}
        accessibilityRole="button"
        accessibilityLabel={comentario.mio ? 'Opciones de tu comentario' : `Opciones del comentario de ${comentario.autor.nombre}`}
        hitSlop={4}
        style={estilos.botonOpciones}
      >
        <MoreHorizontal color={colores.textoSuave} size={20} />
      </Pressable>
    </Pressable>
  );
}

// Las opciones de un comentario: el propio se borra; el de otra persona se
// reporta (con un motivo) o se bloquea a quien lo escribió.
function HojaOpciones({
  comentario,
  reportando,
  onReportar,
  onMotivo,
  onBloquear,
  onBorrar,
  onCerrar,
}: {
  comentario: Comentario | null;
  reportando: boolean;
  onReportar: () => void;
  onMotivo: (m: MotivoReporte) => void;
  onBloquear: () => void;
  onBorrar: () => void;
  onCerrar: () => void;
}) {
  if (!comentario) return null;

  return (
    <HojaInferior visible onCerrar={onCerrar} estilo={estilos.hoja}>
      {reportando ? (
        <>
          <Texto variante="destacado" style={estilos.tituloHoja}>
            ¿Por qué lo reportas?
          </Texto>
          {MOTIVOS.map(({ motivo, etiqueta }) => (
            <OpcionHoja key={motivo} titulo={etiqueta} onPress={() => onMotivo(motivo)} />
          ))}
        </>
      ) : comentario.mio ? (
        <OpcionHoja titulo="Borrar comentario" peligro onPress={onBorrar} />
      ) : (
        <>
          <OpcionHoja titulo="Reportar comentario" onPress={onReportar} />
          <OpcionHoja titulo={`Bloquear a ${comentario.autor.nombre}`} peligro onPress={onBloquear} />
        </>
      )}
      <OpcionHoja titulo="Cancelar" onPress={onCerrar} />
    </HojaInferior>
  );
}

function OpcionHoja({ titulo, onPress, peligro = false }: { titulo: string; onPress: () => void; peligro?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.opcion, pressed ? { backgroundColor: colores.superficieAlta } : null]}
    >
      <Texto peso="seminegrita" style={{ color: peligro ? colores.peligro : colores.texto }}>
        {titulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  lista: { paddingHorizontal: espacio.xl, paddingTop: espacio.m, gap: espacio.l, flexGrow: 1 },
  vacio: { flex: 1, minHeight: 320 },
  mas: { marginVertical: espacio.l },
  comentario: { flexDirection: 'row', gap: espacio.m, alignItems: 'flex-start' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
  },
  cuerpoComentario: { flex: 1, gap: 2 },
  // 48 de toque (con el hitSlop) para un ícono de 20; los márgenes negativos lo
  // dejan visualmente donde estaba, alineado con el nombre.
  botonOpciones: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -10 },
  pie: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  caja: {
    paddingHorizontal: espacio.l,
    paddingTop: espacio.m,
    gap: espacio.s,
    backgroundColor: colores.fondo,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.s },
  entrada: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: espacio.l,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: radios.grande,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    color: colores.texto,
    fontFamily: fuentes.regular,
    fontSize: tamanos.cuerpo,
  },
  enviar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
  },
  enviarInactivo: { opacity: 0.45 },
  error: { color: colores.peligro },
  hoja: { paddingHorizontal: espacio.l },
  tituloHoja: { paddingHorizontal: espacio.m, paddingTop: espacio.m, paddingBottom: espacio.s },
  opcion: { minHeight: 52, justifyContent: 'center', paddingHorizontal: espacio.m, borderRadius: radios.boton },
});
