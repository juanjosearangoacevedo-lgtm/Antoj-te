const { z } = require('./comunes');

// Moderación de comentarios desde el panel (/api/comentarios).

const ESTADOS = ['visible', 'oculto'];

const listar = z.object({
  estado: z.enum(ESTADOS).optional(),
  // '1' = solo los que tienen reportes sin revisar. Texto y no booleano: con
  // z.coerce.boolean, "0" y "false" serían verdaderos.
  reportados: z
    .enum(['1', '0'])
    .optional()
    .transform((v) => v === '1'),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
});

const moderar = z.object({
  estado: z.enum(ESTADOS, { error: "estado debe ser 'visible' u 'oculto'" }),
});

module.exports = { listar, moderar };
