const { z } = require('./comunes');

const iniciar = z.object({
  periodo: z.enum(['mensual', 'anual'], { error: 'El periodo debe ser mensual o anual' }),
});

// El id que Wompi añade a la URL de regreso. Va al path de una petición a
// Wompi, así que solo se admiten letras, dígitos, guion y guion bajo.
const consultar = z.object({
  transaccionId: z.string().trim().min(1).max(64).regex(/^[\w-]+$/, 'id de transacción inválido'),
});

module.exports = { iniciar, consultar };
