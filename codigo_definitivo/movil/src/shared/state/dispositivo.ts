import { randomUUID } from 'expo-crypto';
import { almacenSeguro } from '../almacenamiento/seguro';

// El id de este teléfono: un UUID que se crea en el primer arranque y se guarda.
// Viaja en cada petición (X-Dispositivo) e identifica al visitante en lo que no
// exige cuenta —los "me gusta" y guardados anónimos— y a cada sesión abierta.
// No es una credencial: no abre nada por sí solo.

let promesa: Promise<string> | null = null;

async function cargar(): Promise<string> {
  try {
    const guardado = await almacenSeguro.leer('dispositivo');
    if (guardado) return guardado;
    const nuevo = randomUUID();
    await almacenSeguro.guardar('dispositivo', nuevo);
    return nuevo;
  } catch {
    // Si el almacén seguro falla (pasa en algunos emuladores), la app sigue
    // funcionando con un id de esta ejecución en vez de romper cada petición.
    return randomUUID();
  }
}

/** Nunca falla: siempre devuelve un id, guardado o, en el peor caso, de esta ejecución. */
export function obtenerDispositivoId(): Promise<string> {
  if (!promesa) promesa = cargar();
  return promesa;
}
