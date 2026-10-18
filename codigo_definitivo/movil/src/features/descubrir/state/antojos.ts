import { create } from 'zustand';
import { almacenSeguro } from '@/shared/almacenamiento/seguro';

// Lo que la persona eligió con el botón ANTOJATE. Vive en un store y no en la
// pantalla para que el inicio, la hoja y cualquier pantalla que lo use vean lo
// mismo, y se guarda en el teléfono para que siga ahí al volver a abrir la app.
// Es por dispositivo (no exige cuenta), como los guardados de la fase 2 (D6).

interface EstadoAntojos {
  seleccion: string[];
  /** Ya se leyó lo guardado: antes de esto no se escribe, para no pisarlo. */
  cargado: boolean;
  cargar: () => Promise<void>;
  /** Reemplaza la selección entera (al confirmar la hoja). */
  aplicar: (seleccion: string[]) => void;
  alternar: (id: string) => void;
  quitar: (id: string) => void;
  limpiar: () => void;
}

function guardar(seleccion: string[]): void {
  // Si el llavero falla, la selección sigue en memoria hasta cerrar la app.
  almacenSeguro.guardar('antojos', JSON.stringify(seleccion)).catch(() => {});
}

function leer(texto: string | null): string[] {
  if (!texto) return [];
  try {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const useAntojos = create<EstadoAntojos>((set, get) => {
  const cambiar = (seleccion: string[]) => {
    set({ seleccion });
    if (get().cargado) guardar(seleccion);
  };

  return {
    seleccion: [],
    cargado: false,

    async cargar() {
      if (get().cargado) return;
      const guardada = leer(await almacenSeguro.leer('antojos').catch(() => null));
      // Si la persona ya tocó algo mientras se leía el llavero, gana lo que tocó
      // (y se guarda ahora, que antes no se podía).
      const actual = get().seleccion;
      set({ cargado: true, seleccion: actual.length ? actual : guardada });
      if (actual.length) guardar(actual);
    },

    aplicar: (seleccion) => cambiar([...new Set(seleccion)]),
    alternar: (id) => {
      const actual = get().seleccion;
      cambiar(actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]);
    },
    quitar: (id) => cambiar(get().seleccion.filter((x) => x !== id)),
    limpiar: () => cambiar([]),
  };
});
