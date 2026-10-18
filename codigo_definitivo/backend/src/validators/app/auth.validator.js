const { z, passwordNueva } = require('../comunes');

// Esquemas de /api/app/v1/auth. Recuerda: z.object() BORRA las claves que no
// declara, así que un registro no puede colarse con, por ejemplo, un
// `email_verificado_en` o un `sesion_version` de su cosecha.

// El correo se guarda y se busca en minúsculas y sin espacios: "Ana@Mail.com " y
// "ana@mail.com" son la misma cuenta.
const email = z
  .string({ error: 'Escribe tu correo' })
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu correo')
  .max(160, 'El correo es demasiado largo')
  .email('El correo no tiene un formato válido');

const nombre = z
  .string({ error: 'Escribe tu nombre' })
  .trim()
  .min(2, 'Escribe tu nombre')
  .max(120, 'El nombre es demasiado largo');

// Opcional: lo querrá el restaurante para confirmar una reserva, pero no se pide
// para explorar. Dígitos, espacios, guiones y un + inicial ("+57 300 123 4567").
// La cadena vacía cuenta como "sin teléfono".
const telefono = z
  .string()
  .trim()
  .max(30, 'El teléfono es demasiado largo')
  .regex(/^$|^\+?[0-9][0-9\s-]{5,}[0-9]$/, 'El teléfono solo puede tener números, espacios y guiones')
  .transform((v) => v || null)
  .nullable()
  .optional();

// El refresh token son 32 bytes en base64url (43 caracteres); se admite algo de
// holgura, no cualquier cosa.
const refreshToken = z
  .string({ error: 'Falta el token de sesión' })
  .trim()
  .min(20, 'El token de sesión no es válido')
  .max(200, 'El token de sesión no es válido')
  .regex(/^[A-Za-z0-9_-]+$/, 'El token de sesión no es válido');

const codigo = z
  .string({ error: 'Escribe el código que te enviamos' })
  .trim()
  .regex(/^\d{6}$/, 'El código tiene 6 dígitos');

const registro = z.object({
  nombre,
  email,
  password: passwordNueva,
  telefono,
  // Sin aceptar los términos y la política de privacidad no hay cuenta: es el
  // consentimiento que exige la Ley 1581 para tratar datos personales.
  acepta_terminos: z.literal(true, {
    error: 'Debes aceptar los términos y la política de privacidad',
  }),
});

const login = z.object({
  email,
  password: z.string({ error: 'Escribe tu contraseña' }).min(1, 'Escribe tu contraseña'),
});

const sesion = z.object({ refresh_token: refreshToken });

const recuperar = z.object({ email });

const restablecer = z.object({ email, codigo, password: passwordNueva });

module.exports = { registro, login, sesion, recuperar, restablecer, codigo, telefono, nombre };
