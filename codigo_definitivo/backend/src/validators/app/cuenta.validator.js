const { z, passwordNueva } = require('../comunes');
const { nombre, telefono, codigo } = require('./auth.validator');

// Esquemas de /api/app/v1/cuenta. El correo no se edita aquí a propósito:
// cambiarlo exige verificar el nuevo, y ese flujo todavía no existe.

const actualizar = z
  .object({
    nombre: nombre.optional(),
    telefono,
  })
  .refine((d) => d.nombre !== undefined || d.telefono !== undefined, {
    message: 'No enviaste ningún cambio',
  });

// La actual se pide SIEMPRE aunque el token ya identifique a quien llama. No
// lleva mínimo de longitud: es la que ya existe.
const cambiarPassword = z
  .object({
    actual: z.string({ error: 'Escribe tu contraseña actual' }).min(1, 'Escribe tu contraseña actual'),
    nueva: passwordNueva,
  })
  .refine((d) => d.actual !== d.nueva, {
    message: 'La contraseña nueva debe ser distinta de la actual',
    path: ['nueva'],
  });

const confirmarVerificacion = z.object({ codigo });

// Borrar la cuenta pide la clave: un teléfono prestado no debe bastar.
const eliminar = z.object({
  password: z.string({ error: 'Escribe tu contraseña para confirmar' }).min(1, 'Escribe tu contraseña para confirmar'),
});

module.exports = { actualizar, cambiarPassword, confirmarVerificacion, eliminar };
