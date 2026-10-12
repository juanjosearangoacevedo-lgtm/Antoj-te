import { request } from '@/shared/services/http';

// Endpoints públicos del comensal (/api/public/*). No llevan JWT: la sesión
// del comensal es anónima y se identifica con `sesion_token` + el token del QR.
export const api = {
  resolverMesa: (token) => request(`/public/mesas/${token}`),
  configRestaurante: (token) => request(`/public/${token}/config`),
  feedMenu: (token) => request(`/public/${token}/menu`),

  // Vitrina pública (/r/:slug): la misma carta, sin mesa. Quien llega por aquí
  // viene de Instagram o de un buscador, no está sentado, y por eso no hay
  // carrito ni pedidos — cuelgan de una mesa por clave ajena.
  configPorSlug: (slug) => request(`/public/r/${slug}`),
  feedPorSlug: (slug) => request(`/public/r/${slug}/menu`),
  detallePlato: (platoId) => request(`/public/platos/${platoId}`),
  recomendaciones: (platoId) => request(`/public/platos/${platoId}/recomendaciones`),

  obtenerCarrito: (token, sesionToken) => request(`/public/${token}/carrito/${sesionToken}`),
  agregarAlCarrito: (token, body) =>
    request(`/public/${token}/carrito`, { method: 'POST', body: JSON.stringify(body) }),
  // Las dos llevan `sesion_token` en el cuerpo: el id de la linea no prueba de quien
  // es, y el backend lo exige para que nadie edite el carrito de la mesa de al lado.
  actualizarLinea: (detalleId, body) =>
    request(`/public/carrito/detalle/${detalleId}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminarLinea: (detalleId, sesionToken) =>
    request(`/public/carrito/detalle/${detalleId}`, {
      method: 'DELETE',
      body: JSON.stringify({ sesion_token: sesionToken }),
    }),
  checkout: (token, body) =>
    request(`/public/${token}/carrito/checkout`, { method: 'POST', body: JSON.stringify(body) }),

  toggleFavorito: (body) => request(`/public/favoritos`, { method: 'POST', body: JSON.stringify(body) }),
  misFavoritos: (sesionToken) => request(`/public/favoritos/${sesionToken}`),

  llamarMesero: (token, body) =>
    request(`/public/${token}/llamados`, { method: 'POST', body: JSON.stringify(body) }),

  registrarEvento: (body) => request(`/public/eventos`, { method: 'POST', body: JSON.stringify(body) }),
  misPedidos: (sesionToken) => request(`/public/pedidos/${sesionToken}`),
};
