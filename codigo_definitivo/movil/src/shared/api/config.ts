import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuración de red de la app. Es el ÚNICO sitio que sabe a qué servidor se
// habla; ninguna pantalla ni servicio escribe una URL completa.

export const URL_PRODUCCION = 'https://bitemo.co/api';

/**
 * A qué API hablar, en este orden:
 *   1. EXPO_PUBLIC_API_URL, si está definida (builds de prueba, túneles).
 *   2. En desarrollo, la IP desde la que el teléfono bajó el código: Expo Go ya
 *      llegó al PC por esa IP, así que el backend (puerto 3000) está en la misma.
 *      Así nadie tiene que escribir la IP de su red a mano.
 *   3. Producción.
 */
export function resolverUrlApi({
  variable,
  hostUri,
  desarrollo,
}: {
  variable?: string;
  hostUri?: string | null;
  desarrollo: boolean;
}): string {
  if (variable) return variable.replace(/\/+$/, '');
  if (desarrollo && hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:3000/api`;
  }
  return URL_PRODUCCION;
}

// `process.env.EXPO_PUBLIC_…` se escribe literal: Expo lo sustituye al compilar
// y solo reconoce esa forma exacta.
export const URL_API = resolverUrlApi({
  variable: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  desarrollo: __DEV__,
});

// El CDN de Bunny rechaza con 403 todo lo que llega sin `Referer`: la lista del
// video, sus variantes, cada segmento y las miniaturas (comprobado el
// 2026-09-29). El navegador lo manda solo; un reproductor nativo no. Por eso
// todo video e imagen de Bunny se pide con esta cabecera (expo-video y
// expo-image la aplican a cada petición).
export const REFERER_MEDIOS = 'https://bitemo.co/';
export const CABECERAS_MEDIOS: Readonly<Record<string, string>> = { Referer: REFERER_MEDIOS };

export const VERSION_APP = Constants.expoConfig?.version ?? '0.0.0';

export const PLATAFORMA: 'ios' | 'android' | 'web' =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

// Más que esto esperando una respuesta es peor que un error claro con "Reintentar".
export const TIEMPO_LIMITE_MS = 15_000;
