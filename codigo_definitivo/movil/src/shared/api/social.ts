import { pedir } from './cliente';
import { esquemaComentario, esquemaGuardado, esquemaMeGusta, esquemaPaginaComentarios } from './esquemas';

// La capa social del feed. "Me gusta" y guardados funcionan sin cuenta (son del
// teléfono hasta que la persona entra, y entonces pasan a la cuenta). Comentar,
// reportar y bloquear exigen cuenta: el backend responde 401 CUENTA_REQUERIDA y
// la app abre el acceso antes de intentarlo (useExigirCuenta).

export type MotivoReporte = 'spam' | 'ofensivo' | 'acoso' | 'falso' | 'otro';

export const social = {
  // Idempotente: marcar dos veces deja un solo "me gusta".
  meGusta: (platoId: number, valor: boolean) =>
    pedir(`/app/v1/platos/${platoId}/me-gusta`, { metodo: valor ? 'POST' : 'DELETE', esquema: esquemaMeGusta }),

  guardar: (platoId: number, valor: boolean) =>
    valor
      ? pedir('/app/v1/guardados', { metodo: 'POST', cuerpo: { plato_id: platoId }, esquema: esquemaGuardado })
      : pedir(`/app/v1/guardados/${platoId}`, { metodo: 'DELETE', esquema: esquemaGuardado }),

  comentarios: (platoId: number, cursor: string | null, senal?: AbortSignal) =>
    pedir(`/app/v1/platos/${platoId}/comentarios${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
      esquema: esquemaPaginaComentarios,
      senal,
    }),

  comentar: (platoId: number, texto: string) =>
    pedir(`/app/v1/platos/${platoId}/comentarios`, { metodo: 'POST', cuerpo: { texto }, esquema: esquemaComentario }),

  eliminarComentario: (id: number) => pedir<void>(`/app/v1/comentarios/${id}`, { metodo: 'DELETE' }),

  reportar: (comentarioId: number, motivo: MotivoReporte) =>
    pedir('/app/v1/reportes', { metodo: 'POST', cuerpo: { comentario_id: comentarioId, motivo } }),

  // Se bloquea a partir de un comentario: la app nunca conoce el id de cuenta de nadie.
  bloquear: (comentarioId: number) => pedir('/app/v1/bloqueos', { metodo: 'POST', cuerpo: { comentario_id: comentarioId } }),
};
