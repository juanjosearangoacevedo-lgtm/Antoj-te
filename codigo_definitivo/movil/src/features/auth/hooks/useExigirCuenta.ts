import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useSesion } from '@/shared/state/sesion';
import { useSolicitudAcceso } from '@/shared/state/solicitudAcceso';

/**
 * Pide la cuenta solo cuando hace falta, y devuelve si se consiguió.
 *
 *   const exigirCuenta = useExigirCuenta();
 *   if (!(await exigirCuenta({ motivo: 'Para confirmar tu reserva necesitas crear una cuenta.' }))) return;
 *   // … aquí sigue el flujo, ya con sesión
 *
 * Si ya hay sesión, responde true sin abrir nada. Si no, abre el acceso encima
 * de la pantalla actual y espera: true al entrar o registrarse, false al cerrar.
 */
export function useExigirCuenta() {
  const navegacion = useNavigation();

  return useCallback(
    async (opciones?: { motivo?: string; modo?: 'entrar' | 'registro' }): Promise<boolean> => {
      // Hay sesión guardada que no se pudo comprobar (sin red): se reintenta
      // antes de pedirle a la persona que entre otra vez.
      if (useSesion.getState().estado === 'pendiente') await useSesion.getState().restaurar();
      if (useSesion.getState().estado === 'autenticado') return true;

      const respuesta = useSolicitudAcceso.getState().abrir(opciones?.motivo ?? null);
      navegacion.navigate('Acceso', { motivo: opciones?.motivo, modo: opciones?.modo });
      return respuesta;
    },
    [navegacion]
  );
}
