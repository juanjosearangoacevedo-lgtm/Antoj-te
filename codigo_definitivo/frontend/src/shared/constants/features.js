// Feature flags que trae el plan contratado por cada restaurante.
// El backend las devuelve en el login (`features`) y en /public/:token/config.
export const FEATURES = {
  MENU: 'menu',
  PERSONALIZACION: 'personalizacion',
  CARRITO: 'carrito',
  KDS: 'kds',
  APP_PUBLICA: 'app_publica',
};

// Catálogo que el superadmin marca al armar un plan (PlanesPage).
export const FEATURES_DISPONIBLES = [
  { clave: FEATURES.MENU, nombre: 'Gestión de carta', descripcion: 'Categorías, productos, fotos/videos, precios y orden' },
  { clave: FEATURES.PERSONALIZACION, nombre: 'Personalización visual', descripcion: 'Colores, tipografía, banner, tema claro/oscuro' },
  { clave: FEATURES.CARRITO, nombre: 'Carrito de compras', descripcion: 'El comensal arma y confirma su pedido' },
  { clave: FEATURES.KDS, nombre: 'Panel de cocina', descripcion: 'Órdenes en tiempo real directo a cocina' },
  {
    clave: FEATURES.APP_PUBLICA,
    nombre: 'Aparece en la app',
    descripcion: 'Sus platos salen en el feed de la app móvil y se pueden comentar',
  },
];
