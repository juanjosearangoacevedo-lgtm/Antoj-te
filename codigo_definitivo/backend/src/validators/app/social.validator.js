const { z, id } = require('../comunes');

// Esquemas de la capa social de la app: guardados, comentarios, reportes y
// bloqueos.

const guardado = z.object({ plato_id: id });

const paramsId = z.object({ id });

const MAX_COMENTARIO = 500;

// Se recortan los espacios y se juntan los saltos de línea en serie: un
// comentario de veinte líneas en blanco ocupa la pantalla de todos los demás.
const comentario = z.object({
  texto: z
    .string({ error: 'Escribe tu comentario' })
    .transform((v) => v.trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n'))
    .pipe(
      z
        .string()
        .min(1, 'Escribe tu comentario')
        .max(MAX_COMENTARIO, `El comentario puede tener hasta ${MAX_COMENTARIO} caracteres`)
    ),
});

const listarComentarios = z.object({ cursor: z.string().trim().max(40).optional() });

// Los motivos que ofrece la app al reportar. Un texto libre opcional da contexto
// a quien modera.
const MOTIVOS_REPORTE = ['spam', 'ofensivo', 'acoso', 'falso', 'otro'];

const reporte = z.object({
  comentario_id: id,
  motivo: z.enum(MOTIVOS_REPORTE, { error: 'Elige un motivo' }),
  detalle: z.string().trim().max(300, 'El detalle puede tener hasta 300 caracteres').optional().nullable(),
});

const bloqueo = z.object({ comentario_id: id });

module.exports = { guardado, paramsId, comentario, listarComentarios, reporte, bloqueo, MOTIVOS_REPORTE, MAX_COMENTARIO };
