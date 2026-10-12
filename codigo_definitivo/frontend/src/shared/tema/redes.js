import { Facebook, Globe, Instagram, MessageCircle, Music2, Twitter, Youtube } from 'lucide-react';

// ============================================================================
// FUENTE ÚNICA de las redes sociales del restaurante.
//
// De esta lista salen las dos cosas: el desplegable del panel de personalización
// y el ícono que pinta la pantalla de bienvenida del comensal. Agregar una red
// nueva es agregar una entrada aquí.
//
// Lucide no trae marcas comerciales (no existe un ícono de TikTok ni de
// WhatsApp), así que esas dos van con el ícono que mejor describe la ACCIÓN:
// música corta y conversación. Es deliberado, no un descuido.
// ============================================================================
export const REDES = [
  { clave: 'instagram', nombre: 'Instagram', icono: Instagram, ejemplo: 'https://instagram.com/tu-restaurante' },
  { clave: 'facebook', nombre: 'Facebook', icono: Facebook, ejemplo: 'https://facebook.com/tu-restaurante' },
  { clave: 'tiktok', nombre: 'TikTok', icono: Music2, ejemplo: 'https://tiktok.com/@tu-restaurante' },
  { clave: 'whatsapp', nombre: 'WhatsApp', icono: MessageCircle, ejemplo: 'https://wa.me/573001112233' },
  { clave: 'youtube', nombre: 'YouTube', icono: Youtube, ejemplo: 'https://youtube.com/@tu-restaurante' },
  { clave: 'x', nombre: 'X (Twitter)', icono: Twitter, ejemplo: 'https://x.com/tu-restaurante' },
  { clave: 'sitio', nombre: 'Sitio web', icono: Globe, ejemplo: 'https://tu-restaurante.com' },
];

const POR_CLAVE = Object.fromEntries(REDES.map((r) => [r.clave, r]));

/** La red con esa clave, o una entrada genérica si no está en el catálogo. */
export const redPorClave = (clave) => POR_CLAVE[clave] || { clave, nombre: clave, icono: Globe };

/**
 * Deja pasar SOLO enlaces http(s).
 *
 * El backend ya valida el esquema al guardar (temas.validator.js), pero esto se
 * pinta como href en el teléfono de cada comensal, así que se comprueba también
 * al renderizar: las filas guardadas antes de esa validación no pasaron por
 * ella, y un 'javascript:…' en un href se ejecuta al tocarlo.
 */
export function enlaceSeguro(url) {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
}

/** Las redes utilizables de un tema: con clave conocida o no, pero con URL sana. */
export function redesDelTema(tema) {
  const lista = Array.isArray(tema?.redes_sociales) ? tema.redes_sociales : [];
  return lista
    .filter((r) => r && enlaceSeguro(r.url))
    .map((r) => ({ ...redPorClave(r.red), url: r.url.trim() }));
}
