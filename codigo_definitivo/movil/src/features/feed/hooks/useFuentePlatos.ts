import { useEffect, useRef, useState } from 'react';
import type { PlatoFeed } from '@/shared/api/esquemas';
import type { FuenteFeed } from '@/navigation/tipos';
import { useFeed, useGuardados, usePlatoApp } from './useFeed';

// La lista por la que desliza la pantalla de video, venga de donde venga: el
// feed con unos antojos, los guardados o un plato suelto. Siempre con la misma
// forma, para que la pantalla no tenga que saber de dónde salió.

export interface FuentePlatos {
  platos: PlatoFeed[];
  total: number;
  hayMas: boolean;
  cargandoMas: boolean;
  errorAlCargarMas: boolean;
  cargarMas: () => void;
  cargando: boolean;
  error: Error | null;
  reintentar: () => void;
}

// Fuera del componente: la clave de la lista sale de este arreglo, y uno nuevo
// en cada render la cambiaría.
const SIN_ANTOJOS: string[] = [];
const nada = () => {};
// Si el plato tocado no está en lo cargado, se piden hasta estas páginas más
// antes de buscarlo suelto.
const MAX_PAGINAS_BUSCANDO = 5;

export function useFuentePlatos(fuente: FuenteFeed, platoId: number): FuentePlatos {
  const esFeed = fuente.tipo === 'feed';
  const esGuardados = fuente.tipo === 'guardados';
  const lista = useFeed(esFeed ? fuente.antojos : SIN_ANTOJOS, { habilitado: esFeed });
  const guardados = useGuardados(esGuardados);
  const [suelto, setSuelto] = useState(fuente.tipo === 'plato');
  const plato = usePlatoApp(platoId, suelto);
  const paginasExtra = useRef(0);

  const enLista = esFeed ? lista.platos : esGuardados ? (guardados.data?.items ?? []) : [];
  const esta = enLista.some((p) => p.id === platoId);

  // El plato tocado no está en lo cargado (un enlace, o la lista se refrescó):
  // en el feed se siguen pidiendo páginas un rato; si no aparece, o la lista ya
  // terminó, se pide el plato solo.
  useEffect(() => {
    if (suelto || esta) return;
    if (esFeed) {
      if (lista.cargando || lista.cargandoMas) return;
      if (lista.hayMas && !lista.errorAlCargarMas && paginasExtra.current < MAX_PAGINAS_BUSCANDO) {
        paginasExtra.current += 1;
        lista.cargarMas();
        return;
      }
      setSuelto(true);
    } else if (esGuardados && !guardados.isPending) {
      setSuelto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suelto, esta, esFeed, esGuardados, lista.cargando, lista.cargandoMas, lista.hayMas, lista.platos.length, guardados.isPending]);

  if (suelto && !esta) {
    return {
      platos: plato.data ? [plato.data] : [],
      total: plato.data ? 1 : 0,
      hayMas: false,
      cargandoMas: false,
      errorAlCargarMas: false,
      cargarMas: nada,
      cargando: plato.isPending,
      error: plato.error,
      reintentar: () => void plato.refetch(),
    };
  }
  if (esFeed) return lista;
  return {
    platos: enLista,
    total: enLista.length,
    hayMas: false,
    cargandoMas: false,
    errorAlCargarMas: false,
    cargarMas: nada,
    cargando: guardados.isPending,
    error: guardados.error,
    reintentar: () => void guardados.refetch(),
  };
}
