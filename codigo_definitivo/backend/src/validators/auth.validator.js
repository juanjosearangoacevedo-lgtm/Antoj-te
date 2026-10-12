const { z, passwordNueva } = require('./comunes');

const login = z.object({
  email: z
    .string({ error: 'email y password son obligatorios' })
    .trim()
    .min(1, 'email y password son obligatorios')
    .email('El email no tiene un formato valido'),
  password: z
    .string({ error: 'email y password son obligatorios' })
    .min(1, 'email y password son obligatorios'),
});

// Cambiar la propia contraseña. La actual se pide SIEMPRE, aunque quien llama ya
// venga autenticado: un token robado (o un portátil desbloqueado un minuto)
// serviria si no, y quien lo tenga se queda con la cuenta para siempre cambiando
// la clave. No lleva minimo de longitud porque es la que YA existe y puede ser
// mas corta que el minimo de hoy.
const cambiarPassword = z
  .object({
    actual: z.string({ error: 'Escribe tu contraseña actual' }).min(1, 'Escribe tu contraseña actual'),
    nueva: passwordNueva,
  })
  .refine((d) => d.actual !== d.nueva, {
    message: 'La contraseña nueva debe ser distinta de la actual',
    path: ['nueva'],
  });

// Pedir el enlace de recuperación. Solo se valida la forma del correo: si
// existe o no, no se le dice a nadie.
const recuperar = z.object({
  email: z
    .string({ error: 'Escribe tu correo' })
    .trim()
    .min(1, 'Escribe tu correo')
    .max(255)
    .email('El correo no tiene un formato valido'),
});

// Restablecer con el token del enlace. El token son 32 bytes en base64url
// (43 caracteres); se admite algo de holgura, no cualquier cosa.
const restablecer = z.object({
  token: z
    .string({ error: 'Falta el enlace de recuperacion' })
    .trim()
    .min(20, 'El enlace no es valido')
    .max(100, 'El enlace no es valido')
    .regex(/^[A-Za-z0-9_-]+$/, 'El enlace no es valido'),
  password: passwordNueva,
});

module.exports = { login, cambiarPassword, recuperar, restablecer };
