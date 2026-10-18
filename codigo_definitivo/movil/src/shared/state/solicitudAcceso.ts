import { create } from 'zustand';
import { useSesion } from './sesion';

// "Pide la cuenta en el momento justo y sigue donde estaba".
//
// Explorar nunca exige cuenta; reservar sí. Cuando un flujo la necesita, abre una
// solicitud y ESPERA su respuesta: true si la persona entró o se registró, false
// si cerró la pantalla. El flujo que la pidió (una reserva a medias, por
// ejemplo) sigue ahí debajo, con su borrador intacto, y continúa solo.
//
// La solicitud se resuelve en cuanto la sesión pasa a 'autenticado', venga de
// donde venga (entrar, registrarse o restablecer la clave desde el enlace de
// "¿olvidaste tu contraseña?"). Así ninguna pantalla tiene que acordarse de
// avisar.

interface SolicitudAcceso {
  motivo: string | null;
  resolver: ((conCuenta: boolean) => void) | null;
  abrir: (motivo: string | null) => Promise<boolean>;
  terminar: (conCuenta: boolean) => void;
}

export const useSolicitudAcceso = create<SolicitudAcceso>((set, get) => ({
  motivo: null,
  resolver: null,

  abrir(motivo) {
    // Una solicitud nueva cancela la anterior: solo hay una pantalla de acceso.
    get().resolver?.(false);
    return new Promise<boolean>((resolve) => set({ motivo, resolver: resolve }));
  },

  terminar(conCuenta) {
    const { resolver } = get();
    set({ motivo: null, resolver: null });
    resolver?.(conCuenta);
  },
}));

useSesion.subscribe((sesion, anterior) => {
  if (sesion.estado === 'autenticado' && anterior.estado !== 'autenticado') {
    useSolicitudAcceso.getState().terminar(true);
  }
});
