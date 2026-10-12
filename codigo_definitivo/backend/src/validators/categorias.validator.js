const { z, id, idOpcional, texto, booleano } = require('./comunes');

// Ojo: `restaurante_id` NO se exige aquí. Para un admin de restaurante sale del
// token (resolveRestauranteId); solo el superadmin lo manda en el body. Esa
// resolución es del controller, no del validador.
const crear = z.object({
  nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
  orden: z.coerce.number().int().optional(),
  restaurante_id: idOpcional,
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  orden: z.coerce.number().int().optional(),
  activo: booleano,
});

module.exports = { crear, actualizar };
