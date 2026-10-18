import { pedir } from './cliente';
import { esquemaComensal, esquemaSesion, esquemaVerificacion } from './esquemas';

// La cuenta del comensal: /api/app/v1/cuenta. Todas exigen sesión; el cliente
// adjunta el token y lo renueva si caducó.

export const cuenta = {
  obtener: () => pedir('/app/v1/cuenta', { esquema: esquemaComensal }),

  // `telefono: null` lo borra; omitirlo lo deja como está.
  actualizar: (cambios: { nombre?: string; telefono?: string | null }) =>
    pedir('/app/v1/cuenta', { metodo: 'PUT', cuerpo: cambios, esquema: esquemaComensal }),

  // Devuelve una sesión nueva: cambiar la clave cierra todas las demás.
  cambiarPassword: (actual: string, nueva: string) =>
    pedir('/app/v1/cuenta/password', { metodo: 'PUT', cuerpo: { actual, nueva }, esquema: esquemaSesion }),

  enviarVerificacion: () =>
    pedir('/app/v1/cuenta/verificacion', { metodo: 'POST', esquema: esquemaVerificacion }),

  confirmarVerificacion: (codigo: string) =>
    pedir('/app/v1/cuenta/verificacion/confirmar', { metodo: 'POST', cuerpo: { codigo }, esquema: esquemaComensal }),

  eliminar: (password: string) => pedir<void>('/app/v1/cuenta', { metodo: 'DELETE', cuerpo: { password } }),
};
