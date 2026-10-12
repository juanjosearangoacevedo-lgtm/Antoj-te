const { z, texto, textoOpcional, idOpcional, passwordNueva } = require('./comunes');

// Ojo: z.object() BORRA en silencio las claves no declaradas, así que este
// esquema se escribe leyendo el destructuring de solicitudes.service.js. Si se
// agrega un campo al formulario hay que declararlo aquí o nunca llegará.

// El teléfono se guarda tal cual lo escribe la persona (con espacios, guiones o
// prefijo): normalizarlo a la fuerza rompe números válidos de otros países y
// quien va a llamar es un humano, no un sistema.
const telefono = z
  .string({ error: 'El teléfono es obligatorio' })
  .trim()
  .min(7, 'El teléfono parece incompleto')
  .max(30, 'El teléfono no puede superar 30 caracteres');

// El correo es opcional, pero un <input> vacío llega como '' y '' no es un
// correo válido: se convierte a null ANTES de validar para que no falle por
// dejarlo en blanco, que es justo lo que permitimos.
const email = z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor),
  z.string().trim().max(150).email('Revisa el correo, parece que tiene un error').nullable().optional()
);

const crear = z
  .object({
    restaurante_nombre: texto('El nombre del restaurante', 150),
    ciudad: texto('La ciudad', 100),
    direccion: textoOpcional(255),
    contacto_nombre: texto('Tu nombre', 150),
    telefono,
    email,
    // Con contraseña, la solicitud se convierte en cuenta al aprobarla. Sin ella
    // es solo un contacto, como el formulario de siempre. Las dos entran por
    // aquí porque las dos son "alguien de fuera pidiendo entrar".
    password: passwordNueva.optional(),
    password_confirmacion: z.string().optional(),
    plan_id: idOpcional,
    mensaje: textoOpcional(1000),
    // Campo trampa: el formulario lo oculta por CSS. Si llega con contenido es un
    // bot. Se declara para que Zod no lo borre antes de que el service lo mire.
    trampa: z.string().max(200).optional(),
  })
  .superRefine((datos, ctx) => {
    if (!datos.password) return;

    // Pedir contraseña sin correo dejaría una cuenta con la que nadie puede
    // entrar: el correo ES el usuario en el login.
    if (!datos.email) {
      ctx.addIssue({
        code: 'custom',
        message: 'Necesitamos tu correo para crear la cuenta',
        path: ['email'],
      });
    }
    // La confirmación se comprueba también aquí, no solo en el navegador: el
    // formulario no es la única puerta a este endpoint.
    if (datos.password !== datos.password_confirmacion) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las contraseñas no coinciden',
        path: ['password_confirmacion'],
      });
    }
  });

// Sin el `error` explícito, Zod responde su mensaje por defecto en inglés y
// desentona con el resto de la API.
const ESTADOS = ['nueva', 'contactada', 'cerrada', 'aprobada', 'rechazada'];
const estado = z.enum(ESTADOS, { error: `El estado debe ser: ${ESTADOS.join(', ')}` });

// `aprobada` y `rechazada` NO se ponen a mano con este esquema: son el resultado
// de sus propios endpoints, que además crean o bloquean la cuenta. Dejarlas aquí
// permitiría marcar una solicitud como aprobada sin haber creado nada.
const ESTADOS_MANUALES = ['nueva', 'contactada', 'cerrada'];
const estadoManual = z.enum(ESTADOS_MANUALES, {
  error: `El estado debe ser: ${ESTADOS_MANUALES.join(', ')}`,
});

const aprobar = z.object({ plan_id: idOpcional });

const rechazar = z.object({ motivo: textoOpcional(500) });

const actualizarSeguimiento = z
  .object({
    estado: estadoManual.optional(),
    nota_interna: textoOpcional(2000),
  })
  .refine((d) => d.estado !== undefined || d.nota_interna !== undefined, {
    message: 'Indica el estado o la nota',
  });

// El filtro sí admite los cinco: se puede querer ver las aprobadas.
const filtros = z.object({
  estado: estado.optional(),
});

module.exports = { crear, actualizarSeguimiento, aprobar, rechazar, filtros };
