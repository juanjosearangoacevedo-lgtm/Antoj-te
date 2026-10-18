import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from './errores';

// Reglas comunes de React Query para toda la app.
//
// Reintentar tiene sentido cuando el fallo puede ser pasajero (sin red, un 5xx);
// un 4xx no cambia por repetirlo: el servidor ya dijo que la petición está mal
// o que no hay permiso. Las mutaciones (registrar, pagar, reservar) NUNCA se
// reintentan solas: repetir una escritura sin que la persona lo pida puede
// duplicarla.
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (fallos, err) => {
          if (err instanceof ErrorApi && err.status >= 400 && err.status < 500) return false;
          return fallos < 2;
        },
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
