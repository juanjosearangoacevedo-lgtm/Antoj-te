const { z, textoOpcional, url } = require('./comunes');

// Un color hexadecimal, o vacío/null cuando se hereda el default de Bitemo.
const color = z
  .string()
  .trim()
  .regex(/^$|^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'El color debe ser hexadecimal, por ejemplo #FF7A00')
  .optional()
  .nullable();

const json = z.any().optional().nullable();

// Las opciones "en palabras" (suave, rapida, pantalla_completa…) se validan como
// texto corto y NO con z.enum: el catálogo de valores vive en el frontend
// (shared/tema/opciones.js) y crece cada vez que se agrega una opción. Un enum
// aquí obligaría a tocar dos sitios, y desincronizarlos rompe la pantalla de
// personalización con valores que en realidad son válidos.
const eleccion = z.string().trim().max(30).optional().nullable();

const interruptor = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((v) => (v ? 1 : 0))
  .optional()
  .nullable();

const porcentaje = z.coerce.number().int().min(0).max(100).optional().nullable();

// Los enlaces a redes acaban en un href del menú del comensal, así que el
// esquema se valida AQUÍ y no solo en el panel: un 'javascript:...' guardado
// por un admin se ejecutaría en el teléfono de cada persona que escanee el QR.
// Solo http(s), y con algo después de las barras.
const enlaceRed = z
  .string({ error: 'El enlace de la red es obligatorio' })
  .trim()
  .max(300)
  .regex(/^https?:\/\/\S+$/i, 'El enlace debe empezar por http:// o https://');

// `red` es solo la clave con la que el menú elige el ícono; el catálogo vive en
// el frontend (shared/tema/opciones.js), así que aquí basta con que sea un slug
// corto: una red desconocida se dibuja con un ícono genérico, no rompe nada.
const redesSociales = z
  .array(
    z.object({
      red: z.string().trim().min(1).max(20),
      url: enlaceRed,
    })
  )
  .max(8, 'Como máximo 8 redes')
  .optional()
  .nullable();

const guardar = z.object({
  // --- Colores y marca ---
  color_primario: color,
  color_fondo: color,
  color_botones: color,
  color_texto: color,
  // El único ENUM real en la base: enum('oscuro','claro').
  modo: z.enum(['claro', 'oscuro']).optional().nullable(),

  // --- Tipografía e íconos ---
  tipografia_titulos: textoOpcional(200),
  tipografia_cuerpo: textoOpcional(200),
  iconografia: eleccion,

  // --- Distribución ---
  layout_categorias: eleccion,
  preview_categoria: eleccion,
  altura_categoria: eleccion,
  espaciado: eleccion,
  mostrar_precio_feed: interruptor,

  // --- Pantalla de bienvenida (lo primero que ve el comensal) ---
  llamar_mesero: interruptor,
  mensaje_bienvenida: textoOpcional(200),
  redes_sociales: redesSociales,

  // --- Tarjetas y bordes ---
  estilo_tarjetas: eleccion,
  radio_esquinas: eleccion,
  sombras: eleccion,
  opacidad_overlay: porcentaje,

  // --- Botones ---
  estilo_botones: eleccion,
  forma_botones: eleccion,

  // --- Movimiento ---
  animaciones: eleccion,
  velocidad_animacion: eleccion,

  // --- Medios y estructuras libres ---
  colores_categorias: json,
  banner_url: url,
  portada_url: url,
  videos_destacados: json,
  orden_visual: json,
  config_navegacion: json,
});

module.exports = { guardar };
