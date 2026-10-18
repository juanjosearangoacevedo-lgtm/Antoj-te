import { pedir } from './cliente';
import { esquemaMensaje, esquemaSesion } from './esquemas';

// Acceso del comensal: /api/app/v1/auth. Ninguna de estas manda el access token
// (`sesion: false`): o todavía no hay sesión, o es justo la que se está renovando.

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
  telefono?: string | null;
  acepta_terminos: true;
}

export const auth = {
  registrar: (datos: DatosRegistro) =>
    pedir('/app/v1/auth/registro', { metodo: 'POST', cuerpo: datos, sesion: false, esquema: esquemaSesion }),

  entrar: (email: string, password: string) =>
    pedir('/app/v1/auth/login', {
      metodo: 'POST',
      cuerpo: { email, password },
      sesion: false,
      esquema: esquemaSesion,
    }),

  renovar: (refreshToken: string) =>
    pedir('/app/v1/auth/refresh', {
      metodo: 'POST',
      cuerpo: { refresh_token: refreshToken },
      sesion: false,
      esquema: esquemaSesion,
    }),

  salir: (refreshToken: string) =>
    pedir<void>('/app/v1/auth/logout', { metodo: 'POST', cuerpo: { refresh_token: refreshToken }, sesion: false }),

  recuperar: (email: string) =>
    pedir('/app/v1/auth/recuperar', { metodo: 'POST', cuerpo: { email }, sesion: false, esquema: esquemaMensaje }),

  restablecer: (datos: { email: string; codigo: string; password: string }) =>
    pedir('/app/v1/auth/restablecer', { metodo: 'POST', cuerpo: datos, sesion: false, esquema: esquemaSesion }),
};
