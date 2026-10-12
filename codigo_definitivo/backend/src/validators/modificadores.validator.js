const { z, id, idOpcional, texto, precioOpcional, booleano } = require('./comunes');

const crearGrupo = z
  .object({
    nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
    min_seleccion: z.coerce.number().int().min(0).optional(),
    max_seleccion: z.coerce.number().int().min(1).optional(),
    es_obligatorio: booleano,
    restaurante_id: idOpcional, // solo lo envía el superadmin
  })
  .refine((d) => d.min_seleccion === undefined || d.max_seleccion === undefined || d.min_seleccion <= d.max_seleccion, {
    message: 'min_seleccion no puede ser mayor que max_seleccion',
    path: ['min_seleccion'],
  });

const actualizarGrupo = z.object({
  nombre: texto('nombre').optional(),
  min_seleccion: z.coerce.number().int().min(0).optional(),
  max_seleccion: z.coerce.number().int().min(1).optional(),
  es_obligatorio: booleano,
});

const OBLIGATORIOS_OPCION = 'grupo_id y nombre son obligatorios';

const crearOpcion = z.object({
  grupo_id: z.coerce.number({ error: OBLIGATORIOS_OPCION }).int().positive(OBLIGATORIOS_OPCION),
  nombre: z.string({ error: OBLIGATORIOS_OPCION }).trim().min(1, OBLIGATORIOS_OPCION).max(255),
  precio_adicional: precioOpcional,
  ingrediente_id: idOpcional,
});

const actualizarOpcion = z.object({
  nombre: texto('nombre').optional(),
  precio_adicional: precioOpcional,
  ingrediente_id: idOpcional,
});

module.exports = { crearGrupo, actualizarGrupo, crearOpcion, actualizarOpcion };
