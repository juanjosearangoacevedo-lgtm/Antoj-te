const { z, id, idOpcional, texto, textoOpcional, url, precioOpcional, booleano } = require('./comunes');

// Programación del "recomendado del chef": días en convención DAYOFWEEK de MySQL
// (1=Dom … 7=Sáb) separados por coma, y franja horaria HH:MM.
const dias = z
  .string()
  .trim()
  .regex(/^$|^[1-7](,[1-7])*$/, 'recomendado_dias debe ser una lista de dias entre 1 y 7 separados por coma')
  .optional()
  .nullable();

const hora = z
  .string()
  .trim()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'La hora debe tener formato HH:MM')
  .optional()
  .nullable();

const estadoVideo = z.enum(['procesando', 'listo', 'error']).optional();

// Campos comunes a crear y actualizar. Están declarados TODOS los que consume
// `platos.service`/`platos.model`: si falta uno, Zod lo borraría en silencio.
const camposPlato = {
  categoria_id: id,
  nombre: texto('nombre'),
  descripcion: textoOpcional(2000),
  precio: precioOpcional,
  video_url: z.string().trim().min(1, 'video_url es obligatorio').max(500),
  video_guid: textoOpcional(100),
  video_thumbnail_url: url,
  video_status: estadoVideo,
  imagen_url: url,
  orden: z.coerce.number().int().optional(),
  nivel_picante: z.coerce.number().int().min(0).max(3, 'nivel_picante va de 0 a 3').optional(),
  recomendado_chef: booleano,
  recomendado_dias: dias,
  recomendado_hora_inicio: hora,
  recomendado_hora_fin: hora,
  // "Aparece en la app". Solo cambia el feed de la app: la carta por QR y la
  // vitrina enseñan el plato igual.
  en_feed: booleano,
  // La duración que informa Bunny al terminar de procesar el video. Una hora de
  // techo: un plato no tiene videos más largos.
  duracion_segundos: z.coerce.number().int().min(0).max(3600).optional().nullable(),
};

const crear = z.object(camposPlato);

// En actualizar todo es opcional (es un PATCH de hecho), pero `activo` sí aplica.
const actualizar = z
  .object({
    ...camposPlato,
    categoria_id: id.optional(),
    nombre: texto('nombre').optional(),
    video_url: z.string().trim().min(1).max(500).optional(),
    activo: booleano,
  })
  .partial();

const setIngredientes = z.object({
  ingredientes: z.array(
    z.object({
      ingrediente_id: id,
      cantidad_usada: z.coerce.number().min(0),
    }),
    { error: 'ingredientes debe ser un arreglo' }
  ),
});

const setGruposModificadores = z.object({
  grupo_ids: z.array(id, { error: 'grupo_ids debe ser un arreglo' }),
});

const solicitarSubidaVideo = z.object({
  titulo: textoOpcional(200),
});

module.exports = { crear, actualizar, setIngredientes, setGruposModificadores, solicitarSubidaVideo, idOpcional };
