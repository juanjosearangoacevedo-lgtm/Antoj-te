import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Comentario } from '@/shared/api/esquemas';
import { social, type MotivoReporte } from '@/shared/api/social';
import { actualizarSocial, claves, quitarComentario, sumarComentario } from '../cache';

// "Me gusta", guardados y comentarios.
//
// "Me gusta" y guardar son OPTIMISTAS: el corazón se llena al tocarlo, sin
// esperar a la red, y si la petición falla vuelve como estaba. Con toques
// rápidos (marcar, desmarcar, marcar) pueden ir varias peticiones a la vez y
// volver en otro orden: solo la respuesta de la ÚLTIMA cuenta, para que la
// pantalla acabe mostrando lo que la persona tocó al final.

const ultima = new Map<string, number>();
function nuevaVersion(clave: string): number {
  const version = (ultima.get(clave) ?? 0) + 1;
  ultima.set(clave, version);
  return version;
}
const esLaUltima = (clave: string, version: number | undefined) => ultima.get(clave) === version;

export function useMeGusta() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ platoId, valor }: { platoId: number; valor: boolean }) => social.meGusta(platoId, valor),
    onMutate: ({ platoId, valor }) => {
      const version = nuevaVersion(`me-gusta:${platoId}`);
      actualizarSocial(cliente, platoId, (s) =>
        s.me_gusta_yo === valor ? s : { ...s, me_gusta_yo: valor, me_gusta: Math.max(0, s.me_gusta + (valor ? 1 : -1)) }
      );
      return { version };
    },
    onSuccess: (respuesta, { platoId }, contexto) => {
      if (!esLaUltima(`me-gusta:${platoId}`, contexto?.version)) return;
      actualizarSocial(cliente, platoId, (s) => ({ ...s, me_gusta_yo: respuesta.me_gusta, me_gusta: respuesta.total }));
    },
    onError: (_err, { platoId, valor }, contexto) => {
      if (!esLaUltima(`me-gusta:${platoId}`, contexto?.version)) return;
      actualizarSocial(cliente, platoId, (s) =>
        s.me_gusta_yo !== valor ? s : { ...s, me_gusta_yo: !valor, me_gusta: Math.max(0, s.me_gusta + (valor ? -1 : 1)) }
      );
    },
  });
}

export function useGuardar() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ platoId, valor }: { platoId: number; valor: boolean }) => social.guardar(platoId, valor),
    onMutate: ({ platoId, valor }) => {
      const version = nuevaVersion(`guardado:${platoId}`);
      actualizarSocial(cliente, platoId, (s) => ({ ...s, guardado_yo: valor }));
      return { version };
    },
    onSuccess: () => {
      // La lista de guardados cambió, pero no se pide ya: si la persona está
      // deslizando por sus guardados, el plato que acaba de quitar no debe
      // desaparecer bajo su dedo. Se pide al volver a esa pantalla.
      void cliente.invalidateQueries({ queryKey: claves.guardados, refetchType: 'none' });
    },
    onError: (_err, { platoId, valor }, contexto) => {
      if (!esLaUltima(`guardado:${platoId}`, contexto?.version)) return;
      actualizarSocial(cliente, platoId, (s) => ({ ...s, guardado_yo: !valor }));
    },
  });
}

/** Los comentarios de un plato, del más nuevo al más viejo, página a página. */
export function useComentarios(platoId: number) {
  const consulta = useInfiniteQuery({
    queryKey: claves.comentarios(platoId),
    queryFn: ({ pageParam, signal }) => social.comentarios(platoId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (ultimaPagina) => (ultimaPagina.hay_mas ? ultimaPagina.cursor : undefined),
  });
  const comentarios = useMemo<Comentario[]>(
    () => consulta.data?.pages.flatMap((p) => p.items) ?? [],
    [consulta.data]
  );
  return { ...consulta, comentarios };
}

export function useComentar(platoId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) => social.comentar(platoId, texto),
    onSuccess: (comentario) => {
      sumarComentario(cliente, platoId, comentario);
      actualizarSocial(cliente, platoId, (s) => ({ ...s, comentarios: s.comentarios + 1 }));
    },
  });
}

export function useEliminarComentario(platoId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (comentarioId: number) => social.eliminarComentario(comentarioId),
    onSuccess: (_r, comentarioId) => {
      quitarComentario(cliente, platoId, comentarioId);
      actualizarSocial(cliente, platoId, (s) => ({ ...s, comentarios: Math.max(0, s.comentarios - 1) }));
    },
  });
}

// Reportar saca el comentario de la vista de quien reporta al instante (el
// backend ya no se lo devuelve).
export function useReportar(platoId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ comentarioId, motivo }: { comentarioId: number; motivo: MotivoReporte }) =>
      social.reportar(comentarioId, motivo),
    onSuccess: (_r, { comentarioId }) => quitarComentario(cliente, platoId, comentarioId),
  });
}

// Bloquear esconde TODO lo de esa persona, en cualquier plato: se olvidan los
// comentarios ya cargados y se piden otra vez.
export function useBloquear() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (comentarioId: number) => social.bloquear(comentarioId),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['comentarios'] }),
  });
}
