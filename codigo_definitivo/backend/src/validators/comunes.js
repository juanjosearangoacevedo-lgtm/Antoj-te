const { z } = require('zod');

// Piezas que se repiten en varios esquemas. Mantenerlas aquí evita que cada
// recurso invente su propia idea de "un id válido" o "un texto obligatorio".

const id = z.coerce.number().int().positive();
const idOpcional = id.optional().nullable();

const texto = (etiqueta, max = 255) =>
  z
    .string({ error: `${etiqueta} es obligatorio` })
    .trim()
    .min(1, `${etiqueta} es obligatorio`)
    .max(max, `${etiqueta} no puede superar ${max} caracteres`);

const textoOpcional = (max = 255) => z.string().trim().max(max).optional().nullable();

const url = z.string().trim().max(500).optional().nullable();

const precio = z.coerce.number().min(0, 'El precio no puede ser negativo');
const precioOpcional = precio.optional();

const booleano = z.coerce.boolean().optional();

// Longitud mínima de una contraseña NUEVA. Ocho y no seis: la auditoría de
// seguridad encontró claves débiles activas en producción, y seis caracteres se
// agotan por fuerza bruta en minutos. Solo aplica a lo que se escribe de ahora
// en adelante; las que ya existen no se invalidan.
const MIN_PASSWORD = 8;

const passwordNueva = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
  .max(200, 'La contraseña no puede superar 200 caracteres');

// La sesión anónima del comensal: la genera el navegador (crypto.randomUUID).
//
// Sin ':' porque en `favoritos` un dueño 'c:<id>' es una CUENTA de la app (ver
// models/social.model.js): sin esta regla, el menú web podría marcar o quitar
// "me gusta" en nombre de cualquier cuenta mandando ese token.
const sesionToken = z
  .string({ error: 'sesion_token es obligatorio' })
  .trim()
  .min(1, 'sesion_token es obligatorio')
  .max(100)
  .refine((v) => !v.includes(':'), 'sesion_token no es válido');

// Regla compartida por carrito, favoritos y analítica: la línea apunta a un
// plato O a un combo, nunca a los dos ni a ninguno.
const exigirPlatoOCombo = (datos, ctx) => {
  if (!datos.plato_id && !datos.combo_id) {
    ctx.addIssue({ code: 'custom', message: 'Debes indicar plato_id o combo_id', path: ['plato_id'] });
  }
  if (datos.plato_id && datos.combo_id) {
    ctx.addIssue({
      code: 'custom',
      message: 'No puedes indicar plato_id y combo_id al mismo tiempo',
      path: ['plato_id'],
    });
  }
};

module.exports = {
  z,
  id,
  idOpcional,
  texto,
  textoOpcional,
  url,
  precio,
  precioOpcional,
  booleano,
  sesionToken,
  exigirPlatoOCombo,
  MIN_PASSWORD,
  passwordNueva,
};
