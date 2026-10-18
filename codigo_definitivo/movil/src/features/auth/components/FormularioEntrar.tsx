import { useMutation } from '@tanstack/react-query';
import { LockKeyhole, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { auth } from '@/shared/api/auth';
import { mensajeDeError } from '@/shared/api/errores';
import type { RespuestaSesion } from '@/shared/api/esquemas';
import { Aviso, Boton, Campo, Texto } from '@/shared/components/ui';
import { espacio, radios } from '@/shared/theme';
import { errorCorreo, normalizarCorreo } from '@/shared/utils/validacion';

// Entrar con correo y contraseña: lo único que hoy acepta el backend
// (/app/v1/auth/login). Google y Apple llegarán cuando estén en el servidor; no
// se muestran botones que no funcionan. La sesión ya queda abierta en el teléfono
// (el refresh token dura 60 días), así que no hace falta un "mantener sesión".
export function FormularioEntrar({
  onListo,
  onOlvido,
}: {
  onListo: (respuesta: RespuestaSesion) => Promise<void>;
  onOlvido: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<{ email?: string | null; password?: string | null }>({});
  const refPassword = useRef<TextInput>(null);

  const entrar = useMutation({
    mutationFn: () => auth.entrar(normalizarCorreo(email), password),
    onSuccess: onListo,
  });

  const enviar = () => {
    const nuevos = { email: errorCorreo(email), password: password ? null : 'Escribe tu contraseña' };
    setErrores(nuevos);
    if (!nuevos.email && !nuevos.password) entrar.mutate();
  };

  return (
    <View style={{ gap: espacio.l }}>
      {entrar.isError ? <Aviso tipo="error">{mensajeDeError(entrar.error)}</Aviso> : null}
      <Campo
        etiqueta="Correo"
        icono={Mail}
        placeholder="tucorreo@ejemplo.com"
        value={email}
        onChangeText={setEmail}
        error={errores.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => refPassword.current?.focus()}
      />
      <View style={{ gap: espacio.s }}>
        <Campo
          ref={refPassword}
          etiqueta="Contraseña"
          icono={LockKeyhole}
          value={password}
          onChangeText={setPassword}
          error={errores.password}
          secreto
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={enviar}
        />
        <Pressable onPress={() => onOlvido(email)} accessibilityRole="button" hitSlop={10} style={estilos.olvido}>
          <Texto variante="pequeno" peso="negrita" color="marcaClara">
            ¿Olvidaste tu contraseña?
          </Texto>
        </Pressable>
      </View>
      <Boton titulo="Iniciar sesión" onPress={enviar} cargando={entrar.isPending} style={estilos.principal} />
    </View>
  );
}

const estilos = StyleSheet.create({
  olvido: { alignSelf: 'flex-end', paddingVertical: espacio.xs },
  principal: { minHeight: 56, borderRadius: radios.pildora },
});
