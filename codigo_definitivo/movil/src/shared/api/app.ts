import { pedir } from './cliente';
import { esquemaConfigApp } from './esquemas';

// Configuración que la app pide al arrancar (versión mínima admitida).
export const app = {
  config: () => pedir('/app/v1/config', { sesion: false, esquema: esquemaConfigApp }),
};
