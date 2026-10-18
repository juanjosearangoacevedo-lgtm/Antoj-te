import type { LinkingOptions } from '@react-navigation/native';
import type { RaizParamList } from './tipos';

// Enlaces profundos: bitemo://perfil abre el perfil, etc.
//
// Los enlaces universales (https://bitemo.co/r/:slug que abre la app si está
// instalada y la vitrina web si no) llegan con el perfil de restaurante (fase 4):
// antes hay que dejar pasar /.well-known/ en Nginx, que hoy responde 403.
export const linking: LinkingOptions<RaizParamList> = {
  prefixes: ['bitemo://'],
  config: {
    screens: {
      Principal: {
        screens: {
          Inicio: '',
          Buscar: 'buscar',
          Perfil: 'perfil',
        },
      },
      Cuenta: 'cuenta',
    },
  },
};
