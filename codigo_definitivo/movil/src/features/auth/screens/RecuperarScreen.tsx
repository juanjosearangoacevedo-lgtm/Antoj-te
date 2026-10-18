import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import type { PropsRaiz } from '@/navigation/tipos';
import { auth } from '@/shared/api/auth';
import { mensajeDeError } from '@/shared/api/errores';
import { Aviso, Boton, Campo, Pantalla, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { espacio } from '@/shared/theme';
import {
  errorCodigo,
  errorCorreo,
  errorPasswordNueva,
  MIN_PASSWORD,
  normalizarCorreo,
} from '@/shared/utils/validacion';

// "Olvidé mi contraseña", en dos pasos: el correo recibe un código de 6 dígitos
// y con él se pone una clave nueva. Al terminar la sesión queda abierta.
//
// Código y no enlace: un enlace tendría que abrir la app desde el correo, y eso
// depende de los enlaces universales, que aún no están (ver navigation/linking.ts).
export default function RecuperarScreen({ navigation, route }: PropsRaiz<'Recuperar'>) {
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Partial<Record<'email' | 'codigo' | 'password', string | null>>>({});
  const refPassword = useRef<TextInput>(null);
  const establecer = useSesion((s) => s.establecer);

  const pedirCodigo = useMutation({
    mutationFn: () => auth.recuperar(normalizarCorreo(email)),
    onSuccess: () => setPaso('codigo'),
  });

  const restablecer = useMutation({
    mutationFn: () => auth.restablecer({ email: normalizarCorreo(email), codigo: codigo.trim(), password }),
    onSuccess: async (respuesta) => {
      await establecer(respuesta);
      // Si se llegó desde la pantalla de acceso, se cierran las dos.
      navigation.pop(route.params?.desdeAcceso ? 2 : 1);
    },
  });

  const enviarCorreo = () => {
    const error = errorCorreo(email);
    setErrores({ email: error });
    if (!error) pedirCodigo.mutate();
  };

  const enviarCodigo = () => {
    const nuevos = { codigo: errorCodigo(codigo), password: errorPasswordNueva(password) };
    setErrores(nuevos);
    if (!nuevos.codigo && !nuevos.password) restablecer.mutate();
  };

  if (paso === 'correo') {
    return (
      <Pantalla desplazable bordes={['left', 'right', 'bottom']}>
        <Texto color="textoSuave">Escribe el correo de tu cuenta y te enviamos un código para elegir una contraseña nueva.</Texto>
        {pedirCodigo.isError ? <Aviso tipo="error">{mensajeDeError(pedirCodigo.error)}</Aviso> : null}
        <Campo
          etiqueta="Correo"
          value={email}
          onChangeText={setEmail}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={enviarCorreo}
        />
        <Boton titulo="Enviarme un código" onPress={enviarCorreo} cargando={pedirCodigo.isPending} />
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable bordes={['left', 'right', 'bottom']}>
      {/* Mismo mensaje exista o no la cuenta: lo decide el backend, y aquí no se
          insinúa lo contrario. */}
      <Aviso tipo="info">
        Si ese correo tiene una cuenta en Antojate, te enviamos un código de 6 dígitos. Revisa también el correo no
        deseado.
      </Aviso>
      {restablecer.isError ? <Aviso tipo="error">{mensajeDeError(restablecer.error)}</Aviso> : null}
      <Campo
        etiqueta="Código"
        value={codigo}
        onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
        error={errores.codigo}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="next"
        onSubmitEditing={() => refPassword.current?.focus()}
      />
      <Campo
        ref={refPassword}
        etiqueta="Contraseña nueva"
        value={password}
        onChangeText={setPassword}
        error={errores.password}
        ayuda={`Mínimo ${MIN_PASSWORD} caracteres`}
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={enviarCodigo}
      />
      <View style={{ gap: espacio.s }}>
        <Boton titulo="Cambiar contraseña" onPress={enviarCodigo} cargando={restablecer.isPending} />
        <Boton
          titulo="Enviarme otro código"
          variante="fantasma"
          onPress={() => pedirCodigo.mutate()}
          cargando={pedirCodigo.isPending}
        />
      </View>
    </Pantalla>
  );
}
