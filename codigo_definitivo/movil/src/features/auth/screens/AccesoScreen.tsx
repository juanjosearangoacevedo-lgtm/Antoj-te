import { CupSoda, IceCreamCone, Pizza, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PropsRaiz } from '@/navigation/tipos';
import type { RespuestaSesion } from '@/shared/api/esquemas';
import { Aviso, FondoMarca, IsotipoAntojate, MascotaFlotante, Pantalla, Texto } from '@/shared/components/ui';
import { useSesion } from '@/shared/state/sesion';
import { useSolicitudAcceso } from '@/shared/state/solicitudAcceso';
import { colores, espacio, fuentes, radios } from '@/shared/theme';
import { FormularioEntrar } from '../components/FormularioEntrar';
import { FormularioRegistro } from '../components/FormularioRegistro';

type ModoAcceso = 'entrar' | 'registro';

// Entrar o crear cuenta. Se abre como modal sobre lo que la persona estaba
// haciendo; al cerrarse, eso sigue ahí (ver useExigirCuenta). Arriba va la
// portada de marca (la mascota entre antojos) y debajo el formulario; se pasa de
// entrar a registrarse con el enlace del final, en la misma pantalla.
export default function AccesoScreen({ navigation, route }: PropsRaiz<'Acceso'>) {
  const [modo, setModo] = useState<ModoAcceso>(route.params?.modo ?? 'entrar');
  const motivo = route.params?.motivo;
  const establecer = useSesion((s) => s.establecer);
  const { top } = useSafeAreaInsets();

  // Cerrar sin entrar responde "no" a quien pidió la cuenta. Si ya entró, la
  // solicitud se resolvió al cambiar la sesión y esto no hace nada.
  useEffect(() => () => useSolicitudAcceso.getState().terminar(false), []);

  const alTerminar = async (respuesta: RespuestaSesion) => {
    await establecer(respuesta);
    navigation.goBack();
  };

  const entrando = modo === 'entrar';

  return (
    <Pantalla desplazable relleno={false} bordes={['left', 'right', 'bottom']}>
      <View style={[estilos.portada, { paddingTop: top + espacio.m }]}>
        <FondoMarca />
        <View style={estilos.barra}>
          <View style={estilos.marca}>
            <IsotipoAntojate tamano={34} />
            <Texto style={estilos.nombreMarca}>Antojate</Texto>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
            style={estilos.cerrar}
          >
            <X color="#ffffff" size={22} />
          </Pressable>
        </View>
        <View style={estilos.portadaCuerpo}>
          <View style={estilos.portadaTexto}>
            <Texto style={estilos.lema}>Mira el plato antes de pedirlo.</Texto>
            <Texto variante="pequeno" peso="media" style={estilos.sublema}>
              Videos reales de cada plato, para elegir con antojo.
            </Texto>
          </View>
          <Ilustracion />
        </View>
      </View>

      <View style={estilos.formulario}>
        <View style={estilos.encabezado}>
          <Texto variante="portada">{entrando ? 'Qué bueno verte' : 'Crea tu cuenta'}</Texto>
          <Texto color="textoSuave">
            {entrando
              ? 'Entra para reservar y ver tus reservas.'
              : 'Explorar es libre. La cuenta es para reservar y guardar lo que te gusta.'}
          </Texto>
        </View>
        {motivo ? <Aviso tipo="info">{motivo}</Aviso> : null}
        {entrando ? (
          <FormularioEntrar
            onListo={alTerminar}
            onOlvido={(email) => navigation.navigate('Recuperar', { email, desdeAcceso: true })}
          />
        ) : (
          <FormularioRegistro onListo={alTerminar} />
        )}
        <Pressable
          onPress={() => setModo(entrando ? 'registro' : 'entrar')}
          accessibilityRole="button"
          hitSlop={8}
          style={estilos.cambiarModo}
        >
          <Texto color="textoSuave">
            {entrando ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Texto peso="negrita" color="marcaClara">
              {entrando ? 'Crea una' : 'Inicia sesión'}
            </Texto>
          </Texto>
        </Pressable>
      </View>
    </Pantalla>
  );
}

// La mascota recomendando, entre tres antojos. Los íconos son decorativos.
function Ilustracion() {
  return (
    <View style={estilos.ilustracion} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Antojo icono={Pizza} estilo={{ left: 0, top: 6 }} />
      <Antojo icono={IceCreamCone} estilo={{ right: 0, top: 40 }} />
      <Antojo icono={CupSoda} estilo={{ left: 6, bottom: 18 }} />
      <MascotaFlotante expresion="recomendando" tamano={128} sobreVerde />
    </View>
  );
}

function Antojo({ icono: Icono, estilo }: { icono: LucideIcon; estilo: { left?: number; right?: number; top?: number; bottom?: number } }) {
  return (
    <View style={[estilos.antojo, estilo]}>
      <Icono color={colores.verde} size={18} strokeWidth={2.4} />
    </View>
  );
}

const estilos = StyleSheet.create({
  portada: {
    paddingHorizontal: espacio.xl,
    paddingBottom: espacio.xxl + espacio.l,
    overflow: 'hidden',
    borderBottomLeftRadius: radios.enorme,
    borderBottomRightRadius: radios.enorme,
  },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  nombreMarca: { fontFamily: fuentes.titular, fontSize: 26, lineHeight: 30, color: '#ffffff' },
  cerrar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  portadaCuerpo: { flexDirection: 'row', alignItems: 'center', marginTop: espacio.l },
  portadaTexto: { flex: 1, gap: espacio.s, paddingRight: espacio.s },
  lema: { fontFamily: fuentes.titular, fontSize: 30, lineHeight: 34, color: '#ffffff' },
  sublema: { color: 'rgba(255,255,255,0.92)' },
  ilustracion: { width: 150, height: 160, alignItems: 'center', justifyContent: 'center' },
  antojo: {
    position: 'absolute',
    zIndex: 1,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colores.tinto,
  },
  formulario: {
    marginTop: -espacio.xl,
    borderTopLeftRadius: radios.enorme,
    borderTopRightRadius: radios.enorme,
    backgroundColor: colores.fondo,
    padding: espacio.xl,
    gap: espacio.l,
  },
  encabezado: { gap: espacio.xs },
  cambiarModo: { alignSelf: 'center', paddingVertical: espacio.s },
});
