import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginaComentarios, PaginaFeed, PlatoFeed, SocialPlato } from '@/shared/api/esquemas';
import { claveAntojos } from '@/features/descubrir/logica/antojos';

// Las claves de React Query del feed, en un solo sitio, y cómo se actualiza un
// plato en todas las cachés donde aparece.
//
// Un mismo plato vive a la vez en varias listas (el inicio, los recomendados del
// chef, el feed de su restaurante, los guardados, su ficha suelta). Un "me gusta"
// tiene que verse igual en todas, al instante y sin volver a pedir nada.

export const claves = {
  todo: ['feed'] as const,
  opciones: ['feed', 'opciones'] as const,
  listas: ['feed', 'lista'] as const,
  lista: (antojos: string[]) => ['feed', 'lista', claveAntojos(antojos)] as const,
  conteo: (antojos: string[]) => ['feed', 'conteo', claveAntojos(antojos)] as const,
  plato: (id: number) => ['feed', 'plato', id] as const,
  guardados: ['feed', 'guardados'] as const,
  comentarios: (platoId: number) => ['comentarios', platoId] as const,
};

type CambioSocial = (social: SocialPlato) => SocialPlato;

const cambiarPlato = (plato: PlatoFeed, platoId: number, cambio: CambioSocial): PlatoFeed =>
  plato.id === platoId ? { ...plato, social: cambio(plato.social) } : plato;

/** Aplica `cambio` a lo social del plato en todas las cachés donde esté. */
export function actualizarSocial(cliente: QueryClient, platoId: number, cambio: CambioSocial): void {
  cliente.setQueriesData<InfiniteData<PaginaFeed>>({ queryKey: claves.listas }, (datos) =>
    datos
      ? {
          ...datos,
          pages: datos.pages.map((p) => ({ ...p, items: p.items.map((i) => cambiarPlato(i, platoId, cambio)) })),
        }
      : datos
  );
  cliente.setQueryData<PlatoFeed>(claves.plato(platoId), (datos) => (datos ? cambiarPlato(datos, platoId, cambio) : datos));
  cliente.setQueryData<{ items: PlatoFeed[] }>(claves.guardados, (datos) =>
    datos ? { items: datos.items.map((i) => cambiarPlato(i, platoId, cambio)) } : datos
  );
}

/** Pone un comentario recién escrito arriba de su lista. */
export function sumarComentario(cliente: QueryClient, platoId: number, comentario: PaginaComentarios['items'][number]): void {
  cliente.setQueryData<InfiniteData<PaginaComentarios>>(claves.comentarios(platoId), (datos) => {
    if (!datos || !datos.pages.length) return datos;
    const [primera, ...resto] = datos.pages;
    return { ...datos, pages: [{ ...primera!, items: [comentario, ...primera!.items], total: primera!.total + 1 }, ...resto] };
  });
}

/**
 * Quita un comentario de su lista (lo borró su autor, o quien mira lo reportó)
 * y lo descuenta del total. Ese total es el de lo que esa persona ve, no el del
 * feed, así que baja en los dos casos.
 */
export function quitarComentario(cliente: QueryClient, platoId: number, comentarioId: number): void {
  cliente.setQueryData<InfiniteData<PaginaComentarios>>(claves.comentarios(platoId), (datos) => {
    if (!datos?.pages.some((p) => p.items.some((c) => c.id === comentarioId))) return datos;
    return {
      ...datos,
      pages: datos.pages.map((p) => ({
        ...p,
        items: p.items.filter((c) => c.id !== comentarioId),
        total: Math.max(0, p.total - 1),
      })),
    };
  });
}

/** Los platos de una lista paginada, sin repetir (por si dos páginas se solapan al refrescar). */
export function platosDe(datos: InfiniteData<PaginaFeed> | undefined): PlatoFeed[] {
  if (!datos) return [];
  const vistos = new Set<number>();
  const salida: PlatoFeed[] = [];
  for (const pagina of datos.pages) {
    for (const plato of pagina.items) {
      if (vistos.has(plato.id)) continue;
      vistos.add(plato.id);
      salida.push(plato);
    }
  }
  return salida;
}
