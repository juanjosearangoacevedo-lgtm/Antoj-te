import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import { Aviso, Pantalla, Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';

// SOLO DESARROLLO. Prueba del riesgo técnico más serio del feed (R3 en
// APP_MOVIL.md): el CDN de Bunny responde 403 a lo que llega sin `Referer`, y un
// reproductor nativo no lo manda por defecto. Aquí se reproduce el mismo video
// con y sin la cabecera, en el teléfono real:
//   - con Referer: debe reproducirse y verse la miniatura;
//   - sin Referer: debe fallar las dos cosas.
// Si "con Referer" también falla en iOS o Android, el feed necesita el plan B
// (URLs firmadas de Bunny) antes de la fase 2.
//
// Es un video de la carta de demostración, ya público en bitemo.co.
const CDN = 'https://vz-243cff12-4eb.b-cdn.net';
const GUID = '62fe597d-4af9-4ebf-9f72-f6cc59bc9464';
const HLS = `${CDN}/${GUID}/playlist.m3u8`;
const MINIATURA = `${CDN}/${GUID}/thumbnail.jpg`;

const ESTADOS: Record<VideoPlayerStatus, string> = {
  idle: 'sin empezar',
  loading: 'cargando…',
  readyToPlay: 'reproduciendo ✔',
  error: 'error ✖',
};

function Prueba({ titulo, conReferer }: { titulo: string; conReferer: boolean }) {
  const cabeceras = conReferer ? { ...CABECERAS_MEDIOS } : undefined;
  const reproductor = useVideoPlayer({ uri: HLS, headers: cabeceras }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status, error } = useEvent(reproductor, 'statusChange', { status: reproductor.status });
  const [imagen, setImagen] = useState<'cargando…' | 'se ve ✔' | 'error ✖'>('cargando…');

  return (
    <View style={estilos.tarjeta}>
      <Texto variante="destacado">{titulo}</Texto>
      <View style={estilos.fila}>
        <VideoView player={reproductor} style={estilos.medio} contentFit="cover" nativeControls={false} />
        <Image
          source={{ uri: MINIATURA, headers: cabeceras }}
          // Sin caché: si no, la segunda prueba saldría bien con la imagen que
          // bajó la primera y el resultado mentiría.
          cachePolicy="none"
          style={estilos.medio}
          contentFit="cover"
          onLoad={() => setImagen('se ve ✔')}
          onError={() => setImagen('error ✖')}
        />
      </View>
      <Texto variante="pequeno">
        Video: {ESTADOS[status]}
        {error ? ` — ${error.message}` : ''}
      </Texto>
      <Texto variante="pequeno">Miniatura: {imagen}</Texto>
    </View>
  );
}

export default function DiagnosticoVideoScreen() {
  return (
    <Pantalla desplazable bordes={['left', 'right', 'bottom']}>
      <Aviso tipo="info">
        Resultado esperado: "con Referer" se reproduce y "sin Referer" falla. Si los dos fallan, avisa: el feed
        necesita otro camino antes de la fase 2.
      </Aviso>
      <Prueba titulo="Con Referer (como lo hará la app)" conReferer />
      <Prueba titulo="Sin Referer (el control)" conReferer={false} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espacio.s, padding: espacio.l, borderRadius: radios.tarjeta, backgroundColor: colores.superficie },
  fila: { flexDirection: 'row', gap: espacio.s },
  medio: { flex: 1, aspectRatio: 9 / 16, borderRadius: radios.boton, backgroundColor: colores.fondo },
});
