import { request } from '@/shared/services/http';

// Endpoint público: no lleva JWT porque el directorio es una página abierta.
//
// Devuelve solo los restaurantes que pasan la puerta de calidad del backend
// (services/seo/directorio.js). Esa decisión NO se repite aquí a propósito: si
// el filtro viviera también en el frontend, la lista que ve un visitante y la
// que ve un buscador podrían acabar siendo distintas.
export const obtenerDirectorio = (ciudad) =>
  request(ciudad ? `/public/directorio/${encodeURIComponent(ciudad)}` : '/public/directorio');
