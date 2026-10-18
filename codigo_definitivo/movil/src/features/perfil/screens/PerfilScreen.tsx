import { useFocusEffect } from '@react-navigation/native';
import { Bookmark, KeyRound, LogOut, Video } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useExigirCuenta } from '@/features/auth/hooks/useExigirCuenta';
import { useEspacioBarra } from '@/navigation/BarraFlotante';
import type { PropsTab } from '@/navigation/tipos';
import { URL_API, VERSION_APP } from '@/shared/api/config';
import { cuenta } from '@/shared/api/cuenta';
import { Cargando, ErrorReintentar } from '@/shared/components/estados';
import { Aviso, Boton, Pantalla, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { colores, espacio, radios } from '@/shared/theme';
import { FilaMenu } from '../components/FilaMenu';

// Pestaña Perfil. Sin cuenta invita a crearla (sin obligar); con cuenta muestra
// los datos y las opciones. Los guardados están con o sin cuenta (sin ella, son
// los del teléfono); las reservas se suman aquí en su fase.
export default function PerfilScreen({ navigation }: PropsTab<'Perfil'>) {
  const { estado, comensal } = useSesion(useShallow((s) => ({ estado: s.estado, comensal: s.comensal })));
  const exigirCuenta = useExigirCuenta();
  const espacioBarra = useEspacioBarra();
  const [reintentando, setReintentando] = useState(false);

  // Al volver al perfil, los datos se refrescan en silencio (por ejemplo, si el
  // correo se confirmó desde otro teléfono). Si falla, se queda lo que había.
  useFocusEffect(
    useCallback(() => {
      if (useSesion.getState().estado !== 'autenticado') return;
      cuenta
        .obtener()
        .then((c) => useSesion.getState().actualizarComensal(c))
        .catch(() => {});
    }, [])
  );

  if (estado === 'iniciando') {
    return (
      <Pantalla espacioInferior={espacioBarra}>
        <Cargando />
      </Pantalla>
    );
  }

  if (estado === 'pendiente') {
    return (
      <Pantalla espacioInferior={espacioBarra}>
        <ErrorReintentar
          mensaje="No pudimos comprobar tu sesión. Revisa tu conexión e intenta de nuevo."
          reintentando={reintentando}
          onReintentar={async () => {
            setReintentando(true);
            await useSesion.getState().restaurar();
            setReintentando(false);
          }}
        />
      </Pantalla>
    );
  }

  const confirmarSalida = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión en este teléfono?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => useSesion.getState().cerrar() },
    ]);

  return (
    <Pantalla desplazable espacioInferior={espacioBarra}>
      <Texto variante="titulo">Tu perfil</Texto>

      {estado === 'autenticado' && comensal ? (
        <>
          <View style={estilos.tarjeta}>
            <View style={estilos.avatar}>
              <Texto variante="subtitulo" color="textoSobreMarca">
                {comensal.nombre.trim().charAt(0).toUpperCase()}
              </Texto>
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="destacado">{comensal.nombre}</Texto>
              <Texto variante="pequeno" color="textoSuave">
                {comensal.email}
              </Texto>
            </View>
          </View>

          {comensal.email_verificado ? null : (
            <View style={{ gap: espacio.s }}>
              <Aviso tipo="info">Confirma tu correo: lo necesitarás para confirmar reservas.</Aviso>
              <Boton titulo="Confirmar mi correo" variante="secundario" onPress={() => navigation.navigate('VerificarCorreo')} />
            </View>
          )}

          <View style={{ gap: espacio.s }}>
            <FilaMenu icono={Bookmark} titulo="Guardados" onPress={() => navigation.navigate('Guardados')} />
            <FilaMenu icono={KeyRound} titulo="Tu cuenta" onPress={() => navigation.navigate('Cuenta')} />
            <FilaMenu icono={LogOut} titulo="Cerrar sesión" onPress={confirmarSalida} peligro />
          </View>
        </>
      ) : (
        <View style={estilos.invitacion}>
          <Texto color="textoSuave">
            Explora sin cuenta todo lo que quieras. La necesitas para comentar y reservar, y con ella lo que guardes te
            sigue a cualquier teléfono.
          </Texto>
          <Boton titulo="Crear cuenta" onPress={() => exigirCuenta({ modo: 'registro' })} />
          <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => exigirCuenta({ modo: 'entrar' })} />
          <FilaMenu icono={Bookmark} titulo="Guardados en este teléfono" onPress={() => navigation.navigate('Guardados')} />
        </View>
      )}

      {__DEV__ ? (
        <View style={estilos.desarrollo}>
          <Texto variante="pequeno" color="textoSuave" peso="seminegrita">
            SOLO EN DESARROLLO
          </Texto>
          <FilaMenu icono={Video} titulo="Prueba de video (Bunny)" onPress={() => navigation.navigate('DiagnosticoVideo')} />
          <Texto variante="pequeno" color="textoSuave">
            API: {URL_API}
          </Texto>
        </View>
      ) : null}

      <Texto variante="pequeno" color="textoSuave" style={estilos.version}>
        Antojate {VERSION_APP}
      </Texto>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.l,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.superficie,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colores.marca,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitacion: { gap: espacio.m },
  desarrollo: {
    gap: espacio.s,
    padding: espacio.l,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.linea,
    borderStyle: 'dashed',
  },
  version: { textAlign: 'center', marginTop: 'auto' },
});
