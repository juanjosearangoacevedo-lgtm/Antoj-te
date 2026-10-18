import { useMutation } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PropsRaiz } from '@/navigation/tipos';
import { cuenta } from '@/shared/api/cuenta';
import { mensajeDeError } from '@/shared/api/errores';
import { Vacio } from '@/shared/components/estados';
import { Aviso, Boton, Campo, Pantalla, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio } from '@/shared/theme';
import { errorCodigo } from '@/shared/utils/validacion';

// Confirmar el correo con el código que llegó al crear la cuenta (o uno nuevo).
// La cuenta funciona sin confirmarlo; lo que lo exija (confirmar una reserva, por
// ejemplo) lo pedirá en su momento.
export default function VerificarCorreoScreen({ navigation }: PropsRaiz<'VerificarCorreo'>) {
  const comensal = useSesion((s) => s.comensal);
  const actualizarComensal = useSesion((s) => s.actualizarComensal);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reenviado, setReenviado] = useState(false);

  const confirmar = useMutation({
    mutationFn: () => cuenta.confirmarVerificacion(codigo.trim()),
    onSuccess: actualizarComensal,
  });

  const reenviar = useMutation({
    mutationFn: cuenta.enviarVerificacion,
    onSuccess: async (respuesta) => {
      if (respuesta.ya_verificado) {
        actualizarComensal(await cuenta.obtener());
        return;
      }
      setReenviado(true);
    },
  });

  if (!comensal) {
    return (
      <Pantalla bordes={['left', 'right', 'bottom']}>
        <Vacio titulo="Tu sesión terminó" descripcion="Vuelve a entrar para confirmar tu correo." />
      </Pantalla>
    );
  }

  if (comensal.email_verificado) {
    return (
      <Pantalla bordes={['left', 'right', 'bottom']}>
        <View style={estilos.listo}>
          <CircleCheck color={colores.exito} size={48} />
          <Texto variante="subtitulo" style={estilos.centrado}>
            Tu correo está confirmado
          </Texto>
          <Texto color="textoSuave" style={estilos.centrado}>
            {comensal.email}
          </Texto>
        </View>
        <Boton titulo="Listo" onPress={() => navigation.goBack()} />
      </Pantalla>
    );
  }

  const enviar = () => {
    const nuevo = errorCodigo(codigo);
    setError(nuevo);
    if (!nuevo) confirmar.mutate();
  };

  return (
    <Pantalla desplazable bordes={['left', 'right', 'bottom']}>
      <Texto color="textoSuave">
        Cuando creaste tu cuenta te enviamos un código de 6 dígitos a{' '}
        <Texto peso="seminegrita">{comensal.email}</Texto>. Escríbelo aquí.
      </Texto>
      {reenviado ? <Aviso tipo="exito">Te enviamos un código nuevo. El anterior ya no sirve.</Aviso> : null}
      {confirmar.isError ? <Aviso tipo="error">{mensajeDeError(confirmar.error)}</Aviso> : null}
      {reenviar.isError ? <Aviso tipo="error">{mensajeDeError(reenviar.error)}</Aviso> : null}
      <Campo
        etiqueta="Código"
        value={codigo}
        onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
        error={error}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={enviar}
      />
      <View style={{ gap: espacio.s }}>
        <Boton titulo="Confirmar" onPress={enviar} cargando={confirmar.isPending} />
        <Boton
          titulo="Enviarme otro código"
          variante="fantasma"
          onPress={() => reenviar.mutate()}
          cargando={reenviar.isPending}
        />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  listo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m },
  centrado: { textAlign: 'center' },
});
