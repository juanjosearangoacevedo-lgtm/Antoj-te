const { z, id } = require('../comunes');

// POST /api/app/v1/eventos: las señales del feed, por lotes.
//
// El tipo se acepta como texto y el service descarta los que no conoce: una app
// nueva que estrene un evento no debe perder el lote entero contra un backend
// que todavía no lo sabe guardar.
const evento = z.object({
  tipo: z.string().trim().min(1).max(30),
  plato_id: id.optional().nullable(),
  // Segundos (tiempo visto). Un día como techo: más es un reloj roto.
  valor: z.coerce.number().int().min(0).max(86400).optional().nullable(),
});

const lote = z.object({
  eventos: z.array(evento, { error: 'eventos debe ser un arreglo' }).min(1).max(50, 'Máximo 50 eventos por lote'),
});

module.exports = { lote };
