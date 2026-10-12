const { z, id, idOpcional, texto, booleano } = require('./comunes');

const crear = z.object({
  nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
  costo_unitario: z.coerce.number().min(0).optional(),
  es_alergeno: booleano,
  stock_actual: z.coerce.number().min(0).optional(),
  restaurante_id: idOpcional, // solo lo envía el superadmin
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  costo_unitario: z.coerce.number().min(0).optional(),
  es_alergeno: booleano,
  stock_actual: z.coerce.number().min(0).optional(),
});

// `delta` puede ser negativo (consumo) o positivo (reposición), pero no cero.
const ajustarStock = z.object({
  delta: z.coerce
    .number({ error: 'delta es obligatorio' })
    .refine((n) => n !== 0, 'delta no puede ser 0'),
});

module.exports = { crear, actualizar, ajustarStock };
