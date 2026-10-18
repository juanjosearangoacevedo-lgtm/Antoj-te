import { z } from 'zod';

// Contratos con la API, validados en la frontera: si el backend cambia la forma
// de una respuesta, la app falla aquí con un error claro y no tres pantallas más
// allá con un `undefined`. Los tipos de TypeScript salen de estos esquemas, así
// que el contrato se escribe una sola vez.
//
// Sin compilación dinámica: Zod 4 genera validadores con `new Function`, algo
// que no todos los motores de JavaScript de los teléfonos permiten. `jitless`
// usa la ruta interpretada, que para respuestas de este tamaño es igual de rápida.
z.config({ jitless: true });

export const esquemaComensal = z.object({
  id: z.number(),
  nombre: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  email_verificado: z.boolean(),
  creado_en: z.string(),
});
export type Comensal = z.infer<typeof esquemaComensal>;

// Lo que devuelven registrar, entrar, renovar, cambiar la clave y restablecerla.
export const esquemaSesion = z.object({
  comensal: esquemaComensal,
  access_token: z.string().min(20),
  refresh_token: z.string().min(20),
  expira_en_segundos: z.number(),
});
export type RespuestaSesion = z.infer<typeof esquemaSesion>;

export const esquemaMensaje = z.object({ mensaje: z.string() });

export const esquemaVerificacion = z.object({
  enviado: z.boolean().optional(),
  ya_verificado: z.boolean().optional(),
  minutos_vigencia: z.number().optional(),
});

export const esquemaConfigApp = z.object({
  version_minima: z.object({ ios: z.string(), android: z.string() }),
});
export type ConfigApp = z.infer<typeof esquemaConfigApp>;

// ---------------------------------------------------------------------------
// El feed (fase 2): /app/v1/feed y lo que cuelga de él.

// Lo social de cada plato. `me_gusta_yo` y `guardado_yo` son de quien pregunta:
// la cuenta si hay sesión, el teléfono si no.
export const esquemaSocialPlato = z.object({
  me_gusta: z.number(),
  comentarios: z.number(),
  me_gusta_yo: z.boolean(),
  guardado_yo: z.boolean(),
});
export type SocialPlato = z.infer<typeof esquemaSocialPlato>;

export const esquemaPlatoFeed = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  precio: z.number(),
  moneda: z.string(),
  categoria: z.string().nullable(),
  video_url: z.string(),
  video_thumbnail_url: z.string().nullable(),
  imagen_url: z.string().nullable(),
  duracion_segundos: z.number().nullable(),
  nivel_picante: z.number(),
  recomendado_chef: z.boolean(),
  restaurante: z.object({
    slug: z.string(),
    nombre: z.string(),
    ciudad: z.string().nullable(),
    logo: z.string().nullable(),
  }),
  social: esquemaSocialPlato,
  // La vitrina web del plato: lo que se comparte.
  compartir_url: z.string(),
});
export type PlatoFeed = z.infer<typeof esquemaPlatoFeed>;

// El cursor es opaco: la app lo devuelve tal cual para pedir la página siguiente.
export const esquemaPaginaFeed = z.object({
  items: z.array(esquemaPlatoFeed),
  total: z.number(),
  hay_mas: z.boolean(),
  cursor: z.string().nullable(),
});
export type PaginaFeed = z.infer<typeof esquemaPaginaFeed>;

export const esquemaRestauranteFeed = z.object({
  slug: z.string(),
  nombre: z.string(),
  ciudad: z.string().nullable(),
  descripcion: z.string().nullable(),
  logo: z.string().nullable(),
  total: z.number(),
  // Hasta tres miniaturas de sus propios platos, para su tarjeta.
  miniaturas: z.array(z.string()),
});
export type RestauranteFeed = z.infer<typeof esquemaRestauranteFeed>;

// GET /app/v1/feed/opciones: lo que la hoja ANTOJATE puede ofrecer, calculado
// con los platos reales. Las etiquetas (y el formato de los precios) las pone la app.
export const esquemaOpcionesFeed = z.object({
  total_platos: z.number(),
  total_restaurantes: z.number(),
  categorias: z.array(z.object({ id: z.string(), nombre: z.string(), total: z.number() })),
  chef: z.number(),
  sabor: z.object({ picante: z.number(), suave: z.number() }),
  precio: z.object({ moneda: z.string(), topes: z.array(z.object({ valor: z.number(), total: z.number() })) }),
  restaurantes: z.array(esquemaRestauranteFeed),
});
export type OpcionesFeed = z.infer<typeof esquemaOpcionesFeed>;

export const esquemaConteo = z.object({ total: z.number() });

export const esquemaGuardados = z.object({ items: z.array(esquemaPlatoFeed) });

export const esquemaMeGusta = z.object({ me_gusta: z.boolean(), total: z.number() });
export const esquemaGuardado = z.object({ guardado: z.boolean() });

export const esquemaComentario = z.object({
  id: z.number(),
  texto: z.string(),
  creado_en: z.string(),
  // Antigüedad calculada por la base: la fecha sola no trae zona horaria.
  hace_segundos: z.number(),
  autor: z.object({ nombre: z.string() }),
  mio: z.boolean(),
});
export type Comentario = z.infer<typeof esquemaComentario>;

export const esquemaPaginaComentarios = z.object({
  items: z.array(esquemaComentario),
  total: z.number(),
  hay_mas: z.boolean(),
  cursor: z.string().nullable(),
});
export type PaginaComentarios = z.infer<typeof esquemaPaginaComentarios>;

// GET /public/platos/:id: la ficha que ya usa la web, con los ingredientes y
// los alérgenos que el restaurante cargó. Lo demás del plato llega con el feed.
export const esquemaDetallePlato = z.object({
  id: z.number(),
  descripcion: z.string().nullable(),
  ingredientes: z
    .array(
      z.object({
        id: z.number(),
        nombre: z.string(),
        es_alergeno: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
      })
    )
    .default([]),
});
export type DetallePlato = z.infer<typeof esquemaDetallePlato>;
