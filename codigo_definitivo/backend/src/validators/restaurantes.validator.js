const { z, id, texto, textoOpcional, url } = require('./comunes');

const ESTADOS = ['pendiente', 'activo', 'suspendido'];

const crear = z.object({
  nombre: z.string({ error: 'nombre y plan_id son obligatorios' }).trim().min(1, 'nombre y plan_id son obligatorios').max(255),
  plan_id: z.coerce.number({ error: 'nombre y plan_id son obligatorios' }).int().positive('nombre y plan_id son obligatorios'),
  logo_url: url,
  estado: z.enum(ESTADOS).optional(),
});

const actualizar = z.object({
  nombre: texto('nombre').optional(),
  logo_url: url,
  plan_id: id.optional(),
  estado: z.enum(ESTADOS).optional(),
  moneda: textoOpcional(3),
  // Identidad pública: alimentan /r/:slug y sus metadatos. `descripcion` es lo
  // que evita que todos los restaurantes compartan la misma meta description,
  // que es contenido duplicado y hunde a las páginas parecidas entre sí.
  slug: z
    .string()
    .trim()
    .min(2, 'la dirección es demasiado corta')
    .max(120)
    .regex(/^[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ -]+$/, 'la dirección solo admite letras, números y guiones')
    .optional(),
  descripcion: textoOpcional(300),
  ciudad: textoOpcional(100),
});

const cambiarEstado = z.object({
  estado: z.enum(ESTADOS, { error: `estado debe ser uno de: ${ESTADOS.join(', ')}` }),
});

const cambiarPlan = z.object({
  plan_id: z.coerce.number({ error: 'plan_id es obligatorio' }).int().positive('plan_id es obligatorio'),
});

// Ajuste manual de la suscripción. Cada acción exige solo lo suyo: `dias` para
// sumar, `fecha` para fijar, `periodo` para renovar.
const ajustarSuscripcion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('sumar_dias'),
    dias: z.coerce.number().int().min(1, 'Suma al menos 1 día').max(730, 'Máximo 730 días de una vez'),
  }),
  z.object({
    accion: z.literal('fijar_fecha'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD'),
  }),
  z.object({ accion: z.literal('renovar'), periodo: z.enum(['mensual', 'anual']) }),
  z.object({ accion: z.literal('vencer') }),
  z.object({ accion: z.literal('sin_vencimiento') }),
], { error: 'Acción no válida' });

module.exports = {
  ajustarSuscripcion, crear, actualizar, cambiarEstado, cambiarPlan, ESTADOS };
