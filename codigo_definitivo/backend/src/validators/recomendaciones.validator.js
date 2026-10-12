const { z } = require('./comunes');

const OBLIGATORIOS = 'plato_id_origen y producto_id_recomendado son obligatorios';

const crearOActualizar = z
  .object({
    plato_id_origen: z.coerce.number({ error: OBLIGATORIOS }).int().positive(OBLIGATORIOS),
    producto_id_recomendado: z.coerce.number({ error: OBLIGATORIOS }).int().positive(OBLIGATORIOS),
    puntaje_afinidad: z.coerce.number().min(0).max(1).optional(),
  })
  .refine((d) => d.plato_id_origen !== d.producto_id_recomendado, {
    message: 'Un plato no puede recomendarse a si mismo',
    path: ['producto_id_recomendado'],
  });

module.exports = { crearOActualizar };
