const { z, id, texto } = require('./comunes');

const OBLIGATORIOS = 'sucursal_id y numero_mesa son obligatorios';

const crear = z.object({
  sucursal_id: z.coerce.number({ error: OBLIGATORIOS }).int().positive(OBLIGATORIOS),
  numero_mesa: z.union([z.string().trim().min(1), z.coerce.number()], { error: OBLIGATORIOS }),
});

const actualizar = z.object({
  numero_mesa: z.union([z.string().trim().min(1), z.coerce.number()]).optional(),
});

module.exports = { crear, actualizar };
