import { AppState } from 'react-native';
import { pedir } from './cliente';

// Las señales del feed (qué se vio, cuánto, qué se compartió), por lotes.
//
// Cada evento se apunta en una cola y se manda junto con los demás cada pocos
// segundos, o en cuanto la app pasa a segundo plano: una petición en vez de
// cuatro por video, que además no choca con los frenos de tasa. Son señales, no
// datos de la persona: si un lote no llega (sin red), se pierde y no se insiste.

export type TipoEvento = 'vista' | 'tiempo_visto' | 'video_completo' | 'compartido' | 'detalle_abierto' | 'restaurante_abierto';

export interface Evento {
  tipo: TipoEvento;
  plato_id?: number;
  /** Segundos, para `tiempo_visto`. */
  valor?: number;
}

const POR_LOTE = 50;
// Tope de la cola: sin red durante mucho rato, lo más viejo se descarta antes
// que dejar crecer la memoria.
const MAX_EN_COLA = 200;
const ESPERA_MS = 8_000;

const cola: Evento[] = [];
let temporizador: ReturnType<typeof setTimeout> | null = null;

export function registrarEvento(evento: Evento): void {
  cola.push(evento);
  if (cola.length > MAX_EN_COLA) cola.splice(0, cola.length - MAX_EN_COLA);
  if (!temporizador) temporizador = setTimeout(() => void enviarEventos(), ESPERA_MS);
}

/** Manda lo que haya en la cola, en lotes de hasta 50. */
export async function enviarEventos(): Promise<void> {
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  while (cola.length) {
    const lote = cola.splice(0, POR_LOTE);
    try {
      await pedir<void>('/app/v1/eventos', { metodo: 'POST', cuerpo: { eventos: lote } });
    } catch {
      return; // Se pierde este lote; el resto espera al siguiente intento.
    }
  }
}

/** Para las pruebas: cuántos eventos esperan. */
export const eventosEnCola = () => cola.length;

/** Manda la cola al pasar a segundo plano. Se llama una vez, al arrancar la app. */
export function enviarEventosAlSalir(): () => void {
  const suscripcion = AppState.addEventListener('change', (estado) => {
    if (estado !== 'active') void enviarEventos();
  });
  return () => suscripcion.remove();
}
