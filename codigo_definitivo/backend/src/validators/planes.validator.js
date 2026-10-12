const { z, texto, textoOpcional, precioOpcional } = require('./comunes');

const FEATURES = ['menu', 'personalizacion', 'carrito', 'kds'];

// `nullable` a propósito: en los límites, null significa "sin límite" y es un
// valor que el superadmin tiene que poder guardar. `optional` (ausente) significa
// "no lo toques". El service distingue los dos casos; el validador debe permitirlos.
const limite = z.coerce.number().int().min(0).nullable().optional();

// Máximo 8: la tarjeta de la landing deja de leerse a partir de ahí, y un límite
// en el formulario es mejor aviso que una tarjeta descuadrada en producción.
const caracteristicas = z
  .array(z.string().trim().min(1, 'una característica no puede estar vacía').max(160))
  .max(8, 'máximo 8 características por plan')
  .optional();

const slug = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-zA-Z0-9áéíóúüñ -]+$/, 'el identificador solo admite letras, números y guiones')
  .optional();

const comunes = {
  slug,
  precio: precioOpcional,
  precio_anual: precioOpcional,
  descripcion: textoOpcional(1000),
  limite_platos: limite,
  limite_usuarios: limite,
  orden: z.coerce.number().int().min(0).optional(),
  destacado: z.coerce.boolean().optional(),
  activo: z.coerce.boolean().optional(),
  features: z.array(z.enum(FEATURES)).optional(),
  caracteristicas,
};

const crear = z.object({
  nombre: z.string({ error: 'nombre es obligatorio' }).trim().min(1, 'nombre es obligatorio').max(255),
  ...comunes,
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  ...comunes,
});

module.exports = { crear, actualizar, FEATURES };
