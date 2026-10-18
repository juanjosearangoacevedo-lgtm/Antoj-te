import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colores, espacio, fuentes, radios, tamanos, TOQUE_MINIMO } from '@/shared/theme';
import { Texto } from './Texto';

export interface CampoProps extends TextInputProps {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
  /** Contraseña: oculta el texto y añade el botón de mostrarlo. */
  secreto?: boolean;
  /** Ícono a la izquierda dentro de la caja (correo, candado…). Decorativo: la etiqueta sigue visible. */
  icono?: LucideIcon;
}

// Campo de formulario con su etiqueta visible (no solo placeholder: el
// placeholder desaparece al escribir y deja a la persona sin saber qué campo es).
export const Campo = forwardRef<TextInput, CampoProps>(function Campo(
  { etiqueta, error, ayuda, secreto = false, icono: Icono, onFocus, onBlur, style, ...props },
  ref
) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={estilos.contenedor}>
      <Texto variante="pequeno" color="textoSuave" peso="media">
        {etiqueta}
      </Texto>
      <View
        style={[
          estilos.caja,
          enfocado ? { borderColor: colores.marca } : null,
          error ? { borderColor: colores.peligro } : null,
        ]}
      >
        {Icono ? (
          <View style={estilos.icono} pointerEvents="none">
            <Icono color={enfocado ? colores.marcaClara : colores.textoSuave} size={20} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta}
          accessibilityHint={error ?? ayuda}
          placeholderTextColor={colores.textoSuave}
          selectionColor={colores.marca}
          cursorColor={colores.marca}
          secureTextEntry={secreto && !visible}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
          style={[estilos.entrada, Icono ? estilos.entradaConIcono : null, style]}
          {...props}
        />
        {secreto ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={12}
            style={estilos.ojo}
          >
            {visible ? <EyeOff color={colores.textoSuave} size={20} /> : <Eye color={colores.textoSuave} size={20} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Texto variante="pequeno" color="peligro" accessibilityLiveRegion="polite">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="pequeno" color="textoSuave">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
});

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  caja: {
    minHeight: TOQUE_MINIMO + 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.superficie,
  },
  icono: { paddingLeft: espacio.l },
  entrada: {
    flex: 1,
    minHeight: TOQUE_MINIMO + 4,
    paddingHorizontal: espacio.l,
    color: colores.texto,
    fontFamily: fuentes.regular,
    fontSize: tamanos.cuerpo,
  },
  entradaConIcono: { paddingLeft: espacio.m },
  ojo: { paddingHorizontal: espacio.l },
});
