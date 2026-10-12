// Videos de muestra (dominio publico / demo) — reemplazar por los videos reales del restaurante.
const V = {
  cheesecake: 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4',
  brownie: 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4',
  helado: 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4',
  limonada: 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4',
};

export const MESA_DEMO = {
  mesa_id: 8,
  numero_mesa: '8',
  sucursal_id: 1,
  sucursal_nombre: 'Sede Centro',
  restaurante_id: 1,
  restaurante_nombre: 'Tu Restaurante',
  logo_url: null,
};

export const CATEGORIAS_DEMO = [
  { id: 1, nombre: 'Platos Fuertes', emoji: '🍽️' },
  { id: 2, nombre: 'Entradas', emoji: '🥗' },
  { id: 3, nombre: 'Postres', emoji: '🍰' },
  { id: 4, nombre: 'Jugos', emoji: '🧃' },
  { id: 5, nombre: 'Cócteles', emoji: '🍹' },
  { id: 6, nombre: 'Bebidas Calientes', emoji: '☕' },
  { id: 7, nombre: 'Cervezas', emoji: '🍺' },
  { id: 8, nombre: 'Vinos', emoji: '🍷' },
];

export const PLATOS_DEMO = [
  {
    id: 101,
    nombre: 'Cheesecake de Frutos Rojos',
    descripcion: 'Base de galleta artesanal, queso crema horneado lentamente y coulis de frutos rojos de temporada.',
    precio: 18000,
    video_url: V.cheesecake,
    nivel_picante: 0,
    recomendado_chef: true,
    categoria: 'Postres',
    categoria_id: 3,
    ingredientes: [
      { id: 1, nombre: 'Queso crema', es_alergeno: 1 },
      { id: 2, nombre: 'Galleta de mantequilla', es_alergeno: 1 },
      { id: 3, nombre: 'Frutos rojos', es_alergeno: 0 },
    ],
  },
  {
    id: 102,
    nombre: 'Brownie con Helado',
    descripcion: 'Brownie de chocolate 70% servido tibio con una bola de helado de vainilla y nueces caramelizadas.',
    precio: 16000,
    video_url: V.brownie,
    nivel_picante: 0,
    recomendado_chef: false,
    categoria: 'Postres',
    categoria_id: 3,
    ingredientes: [
      { id: 4, nombre: 'Chocolate 70%', es_alergeno: 0 },
      { id: 5, nombre: 'Nueces', es_alergeno: 1 },
      { id: 6, nombre: 'Helado de vainilla', es_alergeno: 1 },
    ],
  },
  {
    id: 103,
    nombre: 'Copa Helada Especial',
    descripcion: 'Tres bochas de helado artesanal bañadas en chocolate caliente, con crocante de almendra.',
    precio: 15000,
    video_url: V.helado,
    nivel_picante: 0,
    recomendado_chef: true,
    categoria: 'Postres',
    categoria_id: 3,
    ingredientes: [{ id: 6, nombre: 'Helado de vainilla', es_alergeno: 1 }],
  },
  {
    id: 104,
    nombre: 'Limonada Natural',
    descripcion: 'Limones frescos exprimidos al momento, un toque de hierbabuena y jarabe natural.',
    precio: 8000,
    video_url: V.limonada,
    nivel_picante: 0,
    recomendado_chef: false,
    categoria: 'Jugos',
    categoria_id: 4,
    ingredientes: [{ id: 7, nombre: 'Limón', es_alergeno: 0 }],
  },
];

export const GRUPOS_MODIFICADORES_DEMO = {
  101: [
    {
      id: 1,
      nombre: 'Adiciones',
      min_seleccion: 0,
      max_seleccion: 2,
      es_obligatorio: false,
      opciones: [
        { id: 11, nombre: 'Extra frutos rojos', precio_adicional: 3000 },
        { id: 12, nombre: 'Chantilly', precio_adicional: 2000 },
      ],
    },
  ],
};

export function recomendacionesDemo(platoId) {
  return PLATOS_DEMO.filter((p) => p.id !== platoId).slice(0, 3).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    video_url: p.video_url,
    puntaje_afinidad: 0.8,
  }));
}
