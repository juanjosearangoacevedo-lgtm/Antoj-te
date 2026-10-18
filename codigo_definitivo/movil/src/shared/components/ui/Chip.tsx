import { Check, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colores, espacio, radios } from '@/shared/theme';
import { Texto } from './Texto';

export interface ChipProps {
  etiqueta: string;
  onPress?: () => void;
  /** Seleccionado: relleno verde y una marca de verificación. */
  activo?: boolean;
  icono?: LucideIcon;
  /** Opción que existirá pero todavía no tiene datos detrás: se ve, no se toca. */
  pronto?: boolean;
  /** Variante para quitar un filtro ya aplicado: muestra una X. */
  quitable?: boolean;
}

// Píldora seleccionable: antojos, categorías y filtros. El estado activo se nota
// por color Y por la marca de verificación, no solo por color.
export function Chip({ etiqueta, onPress, activo = false, icono: Icono, pronto = false, quitable = false }: ChipProps) {
  const tinta = pronto ? colores.textoSuave : activo ? colores.textoSobreMarca : colores.texto;

  return (
    <Pressable
      onPress={onPress}
      disabled={pronto || !onPress}
      accessibilityRole={quitable ? 'button' : 'checkbox'}
      accessibilityState={quitable ? { disabled: pronto } : { checked: activo, disabled: pronto }}
      accessibilityLabel={quitable ? `Quitar ${etiqueta}` : pronto ? `${etiqueta}, disponible pronto` : etiqueta}
      hitSlop={4}
      style={({ pressed }) => [
        estilos.base,
        activo ? estilos.activo : null,
        pronto ? estilos.pronto : null,
        pressed ? estilos.presionado : null,
      ]}
    >
      {activo && !quitable ? <Check color={tinta} size={16} strokeWidth={3} /> : Icono ? <Icono color={tinta} size={16} /> : null}
      <Texto variante="pequeno" peso="seminegrita" style={{ color: tinta }}>
        {etiqueta}
      </Texto>
      {pronto ? (
        <View style={estilos.etiquetaPronto}>
          <Texto variante="pequeno" peso="seminegrita" style={estilos.textoPronto}>
            Pronto
          </Texto>
        </View>
      ) : null}
      {quitable ? <X color={tinta} size={15} strokeWidth={2.6} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: espacio.m + 2,
    borderRadius: radios.pildora,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.superficie,
  },
  activo: { backgroundColor: colores.marca, borderColor: colores.marca },
  pronto: { opacity: 0.55, borderStyle: 'dashed' },
  presionado: { transform: [{ scale: 0.96 }] },
  etiquetaPronto: {
    backgroundColor: colores.superficieAlta,
    borderRadius: radios.pildora,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  textoPronto: { fontSize: 10, lineHeight: 14, color: colores.textoSuave },
});
