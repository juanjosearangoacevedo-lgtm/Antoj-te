import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorApi } from '@/shared/api/errores';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { feed } from '@/shared/api/feed';
import { claves, platosDe } from '../cache';

// Los datos del feed para las pantallas: las opciones de ANTOJATE, las listas
// paginadas (una por combinación de antojos), un plato suelto y los guardados.
// Las pantallas nunca llaman a la API directamente: usan esto.

const POR_PAGINA = 12;

/** Lo que la hoja ANTOJATE puede ofrecer y los restaurantes del catálogo. */
export function useOpcionesFeed() {
  return useQuery({
    queryKey: claves.opciones,
    queryFn: ({ signal }) => feed.opciones(signal),
    staleTime: 60_000,
  });
}

export interface ListaFeed {
  platos: PlatoFeed[];
  /** Cuántos platos tiene la lista entera, no solo lo cargado. */
  total: number;
  cargando: boolean;
  error: Error | null;
  hayMas: boolean;
  cargandoMas: boolean;
  /** Falló la página siguiente; lo ya cargado sigue ahí. */
  errorAlCargarMas: boolean;
  cargarMas: () => void;
  reintentar: () => void;
}

/**
 * El feed con unos antojos, página a página. La misma selección en otro orden
 * comparte caché, así que el inicio y la pantalla de video que lo recorre ven
 * exactamente la misma lista y en el mismo orden.
 */
export function useFeed(antojos: string[], { habilitado = true }: { habilitado?: boolean } = {}): ListaFeed {
  const cliente = useQueryClient();
  const clave = claves.lista(antojos);
  const consulta = useInfiniteQuery({
    queryKey: clave,
    queryFn: ({ pageParam, signal }) => feed.pagina({ antojos, cursor: pageParam, limite: POR_PAGINA }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => (ultima.hay_mas ? ultima.cursor : undefined),
    enabled: habilitado,
    // Una sesión de feed dura: el orden no cambia mientras alguien desliza, y
    // pedirla otra vez al volver a la pantalla la reordenaría.
    staleTime: 5 * 60_000,
  });
  const { data, error, hasNextPage, isFetchingNextPage, fetchNextPage, isFetchNextPageError, refetch } = consulta;

  // Un cursor que el backend ya no acepta (la lista se armó con otros antojos):
  // se empieza de cero en vez de quedarse atascado.
  useEffect(() => {
    if (error instanceof ErrorApi && error.codigo === 'CURSOR_INVALIDO') {
      void cliente.resetQueries({ queryKey: clave });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const platos = useMemo(() => platosDe(data), [data]);
  const cargarMas = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    platos,
    total: data?.pages[0]?.total ?? 0,
    cargando: habilitado && consulta.isPending,
    error: platos.length ? null : (error as Error | null),
    hayMas: Boolean(hasNextPage),
    cargandoMas: isFetchingNextPage,
    errorAlCargarMas: isFetchNextPageError,
    cargarMas,
    reintentar: () => void refetch(),
  };
}

/**
 * Cuántos platos coinciden con lo que se está marcando en la hoja ANTOJATE. Se
 * pregunta al backend con una pausa corta (250 ms), para no mandar una petición
 * por cada toque, y mientras llega la nueva cifra se sigue enseñando la anterior.
 */
export function useConteoAntojos(borrador: string[], habilitado: boolean) {
  const [enEspera, setEnEspera] = useState(borrador);
  useEffect(() => {
    const t = setTimeout(() => setEnEspera(borrador), 250);
    return () => clearTimeout(t);
  }, [borrador]);

  const consulta = useQuery({
    queryKey: claves.conteo(enEspera),
    queryFn: ({ signal }) => feed.conteo(enEspera, signal),
    enabled: habilitado,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const alDia = consulta.isSuccess && !consulta.isPlaceholderData && enEspera === borrador;
  return { total: consulta.data?.total ?? null, alDia };
}

/** Un plato suelto (un enlace, o un plato que ya no está en la lista). */
export function usePlatoApp(id: number, habilitado: boolean) {
  return useQuery({
    queryKey: claves.plato(id),
    queryFn: ({ signal }) => feed.plato(id, signal),
    enabled: habilitado,
  });
}

export function useGuardados(habilitado = true) {
  return useQuery({
    queryKey: claves.guardados,
    queryFn: ({ signal }) => feed.guardados(signal),
    enabled: habilitado,
  });
}

/** Vuelve a pedir todo el feed desde cero (deslizar para actualizar). */
export function useActualizarFeed() {
  const cliente = useQueryClient();
  const [actualizando, setActualizando] = useState(false);
  const actualizar = useCallback(async () => {
    setActualizando(true);
    try {
      // reset y no refetch: una sesión de feed nueva (con lo recién publicado),
      // no la misma sesión pedida otra vez.
      await cliente.resetQueries({ queryKey: claves.todo });
    } finally {
      setActualizando(false);
    }
  }, [cliente]);
  return { actualizando, actualizar };
}
