const { z, id, idOpcional, texto, booleano } = require('./comunes');

// El tope es 150 y no 255 porque esa es la anchura real de la columna
// (`ingredientes.nombre` VARCHAR(150), igualada en 2026-09-15_saneo_esquema.sql).
// Aceptar 255 aquí solo movía el fallo a MySQL, que lo devolvía como un 500
// ilegible en lugar de un 400 que dice qué campo sobra.
const crear = z.object({
  nombre: texto('nombre', 150),
  costo_unitario: z.coerce.number().min(0).optional(),
  es_alergeno: booleano,
  stock_actual: z.coerce.number().min(0).optional(),
  restaurante_id: idOpcional, // solo lo envía el superadmin
});

const actualizar = z.object({
  nombre: texto('nombre', 150).optional(),
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
