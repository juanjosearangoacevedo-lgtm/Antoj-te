import * as SecureStore from 'expo-secure-store';

// Lo que no puede quedar en texto plano en el teléfono va aquí: Keychain en iOS,
// Keystore en Android. Son el refresh token (abre la cuenta) y el id del
// dispositivo. El access token NO se guarda: vive en memoria y dura 15 minutos.
//
// También se guardan aquí los antojos elegidos con el botón ANTOJATE. No son
// secretos, pero es el único almacén persistente que trae la app y son unos
// pocos bytes; no vale la pena sumar otro paquete solo para eso.

const CLAVES = {
  refresh: 'bitemo.refresh_token',
  dispositivo: 'bitemo.dispositivo_id',
  antojos: 'antojate.antojos',
} as const;

type Clave = keyof typeof CLAVES;

export const almacenSeguro = {
  leer: (clave: Clave) => SecureStore.getItemAsync(CLAVES[clave]),
  guardar: (clave: Clave, valor: string) => SecureStore.setItemAsync(CLAVES[clave], valor),
  borrar: (clave: Clave) => SecureStore.deleteItemAsync(CLAVES[clave]),
};
