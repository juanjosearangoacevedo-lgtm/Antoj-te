import { create } from 'zustand';
import { almacenSeguro } from '../almacenamiento/seguro';
import { auth } from '../api/auth';
import { conectarSesion } from '../api/cliente';
import { ErrorApi } from '../api/errores';
import type { Comensal, RespuestaSesion } from '../api/esquemas';

// La sesión del comensal.
//
//   iniciando   la app acaba de abrir y está leyendo el llavero.
//   anonimo     sin cuenta: se puede explorar todo lo que no la exige.
//   pendiente   hay una sesión guardada pero no se pudo comprobar (sin red). No
//               se borra: en cuanto haya conexión se reintenta.
//   autenticado con cuenta y un access token en memoria.
//
// Zustand y no un Context: el feed de video se re-renderizaría entero cada vez
// que cambiara cualquier cosa de la sesión. Con un store, cada componente se
// suscribe solo a lo que lee.

export type EstadoSesion = 'iniciando' | 'anonimo' | 'pendiente' | 'autenticado';

interface Sesion {
  estado: EstadoSesion;
  comensal: Comensal | null;
  accessToken: string | null;
  /** Lee el llavero al arrancar y, si hay sesión guardada, la renueva. */
  restaurar: () => Promise<void>;
  /** Tras entrar, registrarse, cambiar o restablecer la clave. */
  establecer: (respuesta: RespuestaSesion) => Promise<void>;
  actualizarComensal: (comensal: Comensal) => void;
  /** Cierra la sesión en el teléfono y, salvo que se diga, también en el servidor. */
  cerrar: (opciones?: { avisarAlServidor?: boolean }) => Promise<void>;
}

// El refresh token vive en el llavero; esto es solo para no leerlo en cada
// renovación. Nunca entra en el estado de React (no se pinta en ningún sitio).
let refreshEnMemoria: string | null = null;

async function leerRefresh(): Promise<string | null> {
  if (refreshEnMemoria) return refreshEnMemoria;
  refreshEnMemoria = await almacenSeguro.leer('refresh').catch(() => null);
  return refreshEnMemoria;
}

export const useSesion = create<Sesion>((set, get) => ({
  estado: 'iniciando',
  comensal: null,
  accessToken: null,

  async restaurar() {
    const refresh = await leerRefresh();
    if (!refresh) {
      set({ estado: 'anonimo' });
      return;
    }
    try {
      await get().establecer(await auth.renovar(refresh));
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 401) {
        // La sesión terminó en el servidor (se cerró, cambió la clave, se borró
        // la cuenta): no hay nada que recuperar.
        await get().cerrar({ avisarAlServidor: false });
      } else {
        set({ estado: 'pendiente' });
      }
    }
  },

  async establecer(respuesta) {
    refreshEnMemoria = respuesta.refresh_token;
    await almacenSeguro.guardar('refresh', respuesta.refresh_token);
    set({ estado: 'autenticado', comensal: respuesta.comensal, accessToken: respuesta.access_token });
  },

  actualizarComensal(comensal) {
    set({ comensal });
  },

  async cerrar({ avisarAlServidor = true } = {}) {
    const refresh = refreshEnMemoria;
    refreshEnMemoria = null;
    set({ estado: 'anonimo', comensal: null, accessToken: null });
    await almacenSeguro.borrar('refresh').catch(() => {});
    // Si el aviso no llega (sin red), la sesión del servidor vence sola a los
    // 60 días; en el teléfono ya no queda nada con qué usarla.
    if (avisarAlServidor && refresh) auth.salir(refresh).catch(() => {});
  },
}));

// Lo que el cliente HTTP necesita de la sesión (ver api/cliente.ts).
async function renovarAcceso(): Promise<string | null> {
  const refresh = await leerRefresh();
  if (!refresh) return null;
  try {
    const respuesta = await auth.renovar(refresh);
    await useSesion.getState().establecer(respuesta);
    return respuesta.access_token;
  } catch (err) {
    if (err instanceof ErrorApi && err.status === 401) {
      await useSesion.getState().cerrar({ avisarAlServidor: false });
    }
    // Sin red: la petición original falla con su propio error y la sesión se
    // conserva para el siguiente intento.
    return null;
  }
}

conectarSesion({
  tokenDeAcceso: () => useSesion.getState().accessToken,
  renovar: renovarAcceso,
});
