import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { app } from '@/shared/api/app';
import { PLATAFORMA, VERSION_APP } from '@/shared/api/config';
import { colores, espacio } from '@/shared/theme';
import { debeActualizar } from '@/shared/utils/version';
import { IsotipoAntojate, Texto } from './ui';

// Si el backend dice que esta versión ya no se admite, la app lo avisa en vez de
// fallar de formas raras. Es el freno de emergencia que una app publicada
// necesita desde su primera versión (ver backend/.../config.controller.js).
//
// Si la consulta falla (sin red), la app sigue: nunca se bloquea por no saber.
export function VerificadorVersion({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['config-app'],
    queryFn: app.config,
    staleTime: Infinity,
    retry: false,
  });

  const minima = PLATAFORMA === 'web' ? undefined : data?.version_minima[PLATAFORMA];
  if (!minima || !debeActualizar(VERSION_APP, minima)) return <>{children}</>;

  return (
    <View style={estilos.fondo}>
      <IsotipoAntojate tamano={64} />
      <Texto variante="titulo" style={estilos.centrado}>
        Actualiza Antojate
      </Texto>
      <Texto color="textoSuave" style={estilos.centrado}>
        Esta versión ya no funciona. Descarga la más reciente desde la tienda de aplicaciones para seguir.
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.l,
    padding: espacio.xxl,
    backgroundColor: colores.fondo,
  },
  centrado: { textAlign: 'center' },
});
