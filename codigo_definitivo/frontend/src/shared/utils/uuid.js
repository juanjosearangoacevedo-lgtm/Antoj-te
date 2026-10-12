// Genera un UUID v4 sin depender del contexto seguro del navegador.
//
// POR QUÉ NO SE LLAMA crypto.randomUUID() A SECAS
// Esa función SOLO existe en contextos seguros: HTTPS o localhost. Servido
// por IP sobre HTTP plano no está definida, y la app entera muere con:
//
//   TypeError: crypto.randomUUID is not a function
//
// El error es especialmente traicionero porque en desarrollo nunca aparece:
// http://localhost SÍ cuenta como contexto seguro. Solo se manifiesta al
// desplegar, y tumba el menú del comensal completo — el token de sesión se
// crea antes de pintar nada.
//
// crypto.getRandomValues() en cambio SÍ está disponible sin contexto seguro
// (la restricción aplica a randomUUID y a crypto.subtle, no a él), así que
// la única diferencia real es armar el formato a mano.
//
// No hay una tercera rama con Math.random(): getRandomValues existe en todo
// navegador desde 2011, y caer a un generador predecible para un token que
// identifica el carrito de una persona sería peor que fallar.
export function uuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Los dos ajustes que exige la RFC 4122: versión 4 en el nibble alto del
  // byte 6, y variante 10xx en los dos bits altos del byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
