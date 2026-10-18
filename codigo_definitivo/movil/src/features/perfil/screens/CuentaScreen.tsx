import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { PropsRaiz } from '@/navigation/tipos';
import { cuenta } from '@/shared/api/cuenta';
import { mensajeDeError } from '@/shared/api/errores';
import { Aviso, Boton, Campo, Pantalla, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio, radios } from '@/shared/theme';
import { errorNombre, errorPasswordNueva, errorTelefono, MIN_PASSWORD } from '@/shared/utils/validacion';

// Datos, contraseña y borrar la cuenta. Borrarla desde la app es obligatorio en
// App Store (guía 5.1.1(v)) y en Google Play, y lo pide la Ley 1581.
export default function CuentaScreen({ navigation }: PropsRaiz<'Cuenta'>) {
  const comensal = useSesion((s) => s.comensal);
  const estado = useSesion((s) => s.estado);

  // Si la sesión termina con esta pantalla abierta, no hay cuenta que mostrar.
  useEffect(() => {
    if (estado !== 'autenticado') navigation.goBack();
  }, [estado, navigation]);

  if (!comensal) return null;

  return (
    <Pantalla desplazable bordes={['left', 'right', 'bottom']}>
      <SeccionDatos nombreInicial={comensal.nombre} telefonoInicial={comensal.telefono ?? ''} email={comensal.email} />
      <SeccionPassword />
      <SeccionBorrar />
    </Pantalla>
  );
}

function SeccionDatos({ nombreInicial, telefonoInicial, email }: { nombreInicial: string; telefonoInicial: string; email: string }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [errores, setErrores] = useState<{ nombre?: string | null; telefono?: string | null }>({});

  const guardar = useMutation({
    mutationFn: () => cuenta.actualizar({ nombre: nombre.trim(), telefono: telefono.trim() || null }),
    onSuccess: (c) => useSesion.getState().actualizarComensal(c),
  });

  const enviar = () => {
    const nuevos = { nombre: errorNombre(nombre), telefono: errorTelefono(telefono) };
    setErrores(nuevos);
    if (!nuevos.nombre && !nuevos.telefono) guardar.mutate();
  };

  return (
    <View style={estilos.seccion}>
      <Texto variante="destacado">Tus datos</Texto>
      <Texto variante="pequeno" color="textoSuave">
        Correo: {email}
      </Texto>
      {guardar.isSuccess ? <Aviso tipo="exito">Guardamos tus cambios.</Aviso> : null}
      {guardar.isError ? <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso> : null}
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} error={errores.nombre} autoComplete="name" />
      <Campo
        etiqueta="Teléfono (opcional)"
        value={telefono}
        onChangeText={setTelefono}
        error={errores.telefono}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <Boton titulo="Guardar cambios" variante="secundario" onPress={enviar} cargando={guardar.isPending} />
    </View>
  );
}

function SeccionPassword() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [errores, setErrores] = useState<{ actual?: string | null; nueva?: string | null }>({});

  const cambiar = useMutation({
    mutationFn: () => cuenta.cambiarPassword(actual, nueva),
    onSuccess: async (respuesta) => {
      // El servidor cerró todas las sesiones y abrió una nueva para este teléfono.
      await useSesion.getState().establecer(respuesta);
      setActual('');
      setNueva('');
    },
  });

  const enviar = () => {
    const nuevos = {
      actual: actual ? null : 'Escribe tu contraseña actual',
      nueva: errorPasswordNueva(nueva) ?? (nueva === actual ? 'La contraseña nueva debe ser distinta de la actual' : null),
    };
    setErrores(nuevos);
    if (!nuevos.actual && !nuevos.nueva) cambiar.mutate();
  };

  return (
    <View style={estilos.seccion}>
      <Texto variante="destacado">Contraseña</Texto>
      {cambiar.isSuccess ? (
        <Aviso tipo="exito">Cambiamos tu contraseña y cerramos tu sesión en los demás teléfonos.</Aviso>
      ) : null}
      {cambiar.isError ? <Aviso tipo="error">{mensajeDeError(cambiar.error)}</Aviso> : null}
      <Campo
        etiqueta="Contraseña actual"
        value={actual}
        onChangeText={setActual}
        error={errores.actual}
        secreto
        autoComplete="current-password"
        textContentType="password"
      />
      <Campo
        etiqueta="Contraseña nueva"
        value={nueva}
        onChangeText={setNueva}
        error={errores.nueva}
        ayuda={`Mínimo ${MIN_PASSWORD} caracteres`}
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Boton titulo="Cambiar contraseña" variante="secundario" onPress={enviar} cargando={cambiar.isPending} />
    </View>
  );
}

function SeccionBorrar() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const borrar = useMutation({
    mutationFn: () => cuenta.eliminar(password),
    // La cuenta ya no existe en el servidor: solo queda olvidarla aquí. La
    // pantalla se cierra sola al cambiar la sesión.
    onSuccess: () => useSesion.getState().cerrar({ avisarAlServidor: false }),
  });

  const pedirConfirmacion = () => {
    if (!password) {
      setError('Escribe tu contraseña para confirmar');
      return;
    }
    setError(null);
    Alert.alert(
      'Borrar tu cuenta',
      'Se borrarán tu cuenta y tus datos de Antojate. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar mi cuenta', style: 'destructive', onPress: () => borrar.mutate() },
      ]
    );
  };

  return (
    <View style={[estilos.seccion, estilos.peligro]}>
      <Texto variante="destacado" color="peligro">
        Borrar tu cuenta
      </Texto>
      <Texto variante="pequeno" color="textoSuave">
        Se borran tu cuenta y tus datos. Podrás seguir explorando Antojate sin cuenta.
      </Texto>
      {borrar.isError ? <Aviso tipo="error">{mensajeDeError(borrar.error)}</Aviso> : null}
      <Campo
        etiqueta="Tu contraseña"
        value={password}
        onChangeText={setPassword}
        error={error}
        secreto
        autoComplete="current-password"
        textContentType="password"
      />
      <Boton titulo="Borrar mi cuenta" variante="peligro" icono={Trash2} onPress={pedirConfirmacion} cargando={borrar.isPending} />
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    gap: espacio.m,
    padding: espacio.l,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.superficie,
  },
  peligro: { borderWidth: 1, borderColor: colores.peligroTenue },
});
