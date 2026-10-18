import { useMutation } from '@tanstack/react-query';
import { LockKeyhole, Mail, Phone, UserRound } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { auth } from '@/shared/api/auth';
import { mensajeDeError } from '@/shared/api/errores';
import type { RespuestaSesion } from '@/shared/api/esquemas';
import { Aviso, Boton, Campo, Casilla } from '@/shared/components/ui';
import { espacio, radios } from '@/shared/theme';
import {
  errorCorreo,
  errorNombre,
  errorPasswordNueva,
  errorTelefono,
  MIN_PASSWORD,
  normalizarCorreo,
} from '@/shared/utils/validacion';

type Errores = Partial<Record<'nombre' | 'email' | 'password' | 'telefono' | 'terminos', string | null>>;

export function FormularioRegistro({ onListo }: { onListo: (respuesta: RespuestaSesion) => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const refEmail = useRef<TextInput>(null);
  const refPassword = useRef<TextInput>(null);
  const refTelefono = useRef<TextInput>(null);

  const registrar = useMutation({
    mutationFn: () =>
      auth.registrar({
        nombre: nombre.trim(),
        email: normalizarCorreo(email),
        password,
        telefono: telefono.trim() || null,
        acepta_terminos: true,
      }),
    onSuccess: onListo,
  });

  const enviar = () => {
    const nuevos: Errores = {
      nombre: errorNombre(nombre),
      email: errorCorreo(email),
      password: errorPasswordNueva(password),
      telefono: errorTelefono(telefono),
      terminos: acepta ? null : 'Para crear la cuenta tienes que aceptar los términos y la política de privacidad',
    };
    setErrores(nuevos);
    if (!Object.values(nuevos).some(Boolean)) registrar.mutate();
  };

  return (
    <View style={{ gap: espacio.l }}>
      {registrar.isError ? <Aviso tipo="error">{mensajeDeError(registrar.error)}</Aviso> : null}
      <Campo
        etiqueta="Nombre"
        icono={UserRound}
        value={nombre}
        onChangeText={setNombre}
        error={errores.nombre}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => refEmail.current?.focus()}
      />
      <Campo
        ref={refEmail}
        etiqueta="Correo"
        icono={Mail}
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
      <Campo
        ref={refPassword}
        etiqueta="Contraseña"
        icono={LockKeyhole}
        value={password}
        onChangeText={setPassword}
        error={errores.password}
        ayuda={`Mínimo ${MIN_PASSWORD} caracteres`}
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => refTelefono.current?.focus()}
      />
      <Campo
        ref={refTelefono}
        etiqueta="Teléfono (opcional)"
        icono={Phone}
        value={telefono}
        onChangeText={setTelefono}
        error={errores.telefono}
        ayuda="Lo usará el restaurante para confirmar tus reservas"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
      />
      {/* La política de privacidad todavía no está publicada en bitemo.co: tiene
          que existir (y enlazarse aquí) antes de que se registre nadie real.
          Es un requisito de la Ley 1581 y de las dos tiendas. */}
      <Casilla marcada={acepta} onCambiar={setAcepta} error={errores.terminos}>
        Acepto los términos y la política de privacidad de Antojate, y autorizo el tratamiento de mis datos para
        gestionar mi cuenta y mis reservas.
      </Casilla>
      <Boton
        titulo="Crear cuenta"
        onPress={enviar}
        cargando={registrar.isPending}
        style={{ minHeight: 56, borderRadius: radios.pildora }}
      />
    </View>
  );
}
