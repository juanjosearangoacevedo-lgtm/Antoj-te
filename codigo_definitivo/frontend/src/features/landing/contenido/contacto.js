// Canales de contacto directo de Antojate.
//
// WhatsApp pide el número en formato internacional, sin '+', espacios ni
// guiones: 57 (Colombia) + el número.
export const WHATSAPP_NUMERO = '573219023372';
export const WHATSAPP_VISIBLE = '+57 321 902 3372';

const SALUDO = 'Hola, vi la página de Antojate y quiero saber más sobre el menú digital para mi restaurante.';

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(SALUDO)}`;
