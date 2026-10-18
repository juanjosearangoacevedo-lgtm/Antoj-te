import { SlidersHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { MascotaAntojate, Texto } from '@/shared/components/ui';
import { colores, espacio, fuentes, radios } from '@/shared/theme';

// El botón ANTOJATE: gratis, para todos, sin cuenta. Abre la hoja donde la persona
// dice qué se le antoja, y con eso se ajusta el inicio. Va con el estilo sticker
// de la marca (borde de tinta y sombra dura amarilla) para que se note entre todo
// lo demás, y avisa cuántos antojos hay activos.
export function BotonAntojate({ activos, onPress }: { activos: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={activos ? `ANTOJATE, ${activos} ${activos === 1 ? 'antojo activo' : 'antojos activos'}` : 'ANTOJATE'}
      accessibilityHint="Elige qué se te antoja y ajustamos lo que ves"
      style={({ pressed }) => [estilos.envoltura, pressed ? estilos.presionado : null]}
    >
      {/* La sombra dura del sticker: una copia corrida, detrás. */}
      <View style={estilos.sombra} />
      <View style={estilos.boton}>
        <View style={estilos.mascota}>
          <MascotaAntojate expresion="increible" tamano={52} />
        </View>
        <View style={estilos.textos}>
          <Texto style={estilos.titulo}>ANTOJATE</Texto>
          <Texto variante="pequeno" peso="seminegrita" style={estilos.subtitulo} numberOfLines={1}>
            {activos ? 'Toca para cambiar tus antojos' : 'Dinos qué se te antoja'}
          </Texto>
        </View>
        {activos ? (
          <View style={estilos.contador}>
            <Texto peso="negrita" style={estilos.textoContador}>
              {activos}
            </Texto>
          </View>
        ) : (
          <SlidersHorizontal color={colores.tinto} size={22} strokeWidth={2.4} />
        )}
      </View>
    </Pressable>
  );
}

const ALTO = 72;

const estilos = StyleSheet.create({
  envoltura: { height: ALTO + 5, paddingRight: 5 },
  presionado: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  sombra: {
    position: 'absolute',
    left: 5,
    top: 5,
    right: 0,
    height: ALTO,
    borderRadius: radios.pildora,
    backgroundColor: colores.mazorca,
  },
  boton: {
    height: ALTO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingLeft: espacio.s,
    paddingRight: espacio.xl,
    borderRadius: radios.pildora,
    borderWidth: 2.5,
    borderColor: colores.tinto,
    backgroundColor: colores.arepa,
  },
  mascota: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  textos: { flex: 1 },
  titulo: { fontFamily: fuentes.titular, fontSize: 24, lineHeight: 28, letterSpacing: 1.2, color: colores.tinto },
  subtitulo: { color: '#5b4a3e' },
  contador: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.marca,
  },
  textoContador: { color: '#ffffff' },
});
