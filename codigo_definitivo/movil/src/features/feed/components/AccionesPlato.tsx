import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import { Bookmark, Heart, MessageCircle, Send } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CABECERAS_MEDIOS } from '@/shared/api/config';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { Texto } from '@/shared/components/ui';
import { colores, radios } from '@/shared/theme';
import { formatearConteo } from '@/shared/utils/formato';

// La columna de acciones del video, a la derecha, como en TikTok o Reels: el
// restaurante arriba (abre su perfil) y debajo me gusta, comentarios, guardar y
// compartir. Cada botón tiene su texto para lectores de pantalla y un área de
// toque de 48 px aunque el ícono se vea más chico.

export const AccionesPlato = memo(function AccionesPlato({
  plato,
  onRestaurante,
  onMeGusta,
  onComentarios,
  onGuardar,
  onCompartir,
}: {
  plato: PlatoFeed;
  onRestaurante: () => void;
  onMeGusta: () => void;
  onComentarios: () => void;
  onGuardar: () => void;
  onCompartir: () => void;
}) {
  const { social, restaurante } = plato;

  return (
    <View style={estilos.columna}>
      <Pressable
        onPress={onRestaurante}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${restaurante.nombre}`}
        hitSlop={6}
        style={({ pressed }) => [estilos.avatar, pressed ? estilos.presionado : null]}
      >
        {restaurante.logo ? (
          <Image source={{ uri: restaurante.logo, headers: CABECERAS_MEDIOS }} style={estilos.logo} contentFit="cover" />
        ) : (
          <Texto peso="negrita" style={estilos.inicial}>
            {restaurante.nombre.trim().charAt(0).toUpperCase()}
          </Texto>
        )}
      </Pressable>

      <Accion
        icono={Heart}
        activo={social.me_gusta_yo}
        colorActivo="#ff4d6d"
        etiqueta={social.me_gusta ? formatearConteo(social.me_gusta) : 'Me gusta'}
        accesible={social.me_gusta_yo ? `Quitar me gusta, ${social.me_gusta}` : `Me gusta, ${social.me_gusta}`}
        onPress={onMeGusta}
      />
      <Accion
        icono={MessageCircle}
        etiqueta={social.comentarios ? formatearConteo(social.comentarios) : 'Comentar'}
        accesible={`Comentarios, ${social.comentarios}`}
        onPress={onComentarios}
      />
      <Accion
        icono={Bookmark}
        activo={social.guardado_yo}
        colorActivo={colores.mazorca}
        etiqueta={social.guardado_yo ? 'Guardado' : 'Guardar'}
        accesible={social.guardado_yo ? 'Quitar de guardados' : 'Guardar'}
        onPress={onGuardar}
      />
      <Accion icono={Send} etiqueta="Compartir" accesible="Compartir" onPress={onCompartir} />
    </View>
  );
});

function Accion({
  icono: Icono,
  etiqueta,
  accesible,
  activo = false,
  colorActivo = '#ffffff',
  onPress,
}: {
  icono: LucideIcon;
  etiqueta: string;
  accesible: string;
  activo?: boolean;
  colorActivo?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accesible}
      accessibilityState={{ selected: activo }}
      hitSlop={4}
      style={({ pressed }) => [estilos.accion, pressed ? estilos.presionado : null]}
    >
      <Icono color={activo ? colorActivo : '#ffffff'} fill={activo ? colorActivo : 'transparent'} size={30} strokeWidth={2} />
      <Texto variante="pequeno" peso="seminegrita" style={estilos.etiqueta} numberOfLines={1}>
        {etiqueta}
      </Texto>
    </Pressable>
  );
}

const sombra = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

const estilos = StyleSheet.create({
  columna: { alignItems: 'center', gap: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  inicial: { color: '#ffffff', fontSize: 20, lineHeight: 24 },
  accion: { minWidth: 56, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radios.boton },
  etiqueta: { color: '#ffffff', fontSize: 12, lineHeight: 15, ...sombra },
  presionado: { transform: [{ scale: 0.9 }] },
});
