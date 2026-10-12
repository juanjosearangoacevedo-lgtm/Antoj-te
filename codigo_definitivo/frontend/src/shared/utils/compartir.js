// Compartir y copiar sin depender del contexto seguro del navegador.
//
// POR QUÉ NO SE LLAMA navigator.clipboard A SECAS
// Igual que crypto.randomUUID (ver shared/utils/uuid.js), la API de portapapeles
// SOLO existe en contextos seguros: HTTPS o localhost. Servido por IP sobre HTTP
// plano, `navigator.clipboard` es undefined y "Copiar enlace" explota.
//
// Y como http://localhost SÍ cuenta como contexto seguro, en desarrollo nunca
// se ve: el fallo aparece solo al desplegar, que es exactamente donde el
// comensal lo usaría.
//
// El respaldo es document.execCommand('copy'), obsoleto pero disponible en todo
// navegador y sin restricción de contexto seguro.

/** Copia texto al portapapeles. Devuelve true si lo consiguió. */
export async function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Permiso denegado o documento sin foco: se intenta el respaldo.
    }
  }

  // El textarea se posiciona fuera de pantalla en vez de ocultarse con
  // display:none, porque un elemento no renderizado no se puede seleccionar.
  //
  // El tamaño de fuente en 16px no es estética: por debajo de eso Safari hace
  // zoom al enfocar un campo, y el salto se ve aunque el campo esté fuera de
  // pantalla.
  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  area.style.fontSize = '16px';
  area.contentEditable = 'true';
  area.readOnly = false;
  document.body.appendChild(area);

  try {
    // iOS Safari ignora textarea.select(): hay que construir el rango a mano y
    // rematar con setSelectionRange, o execCommand copia una cadena vacía. Es
    // la diferencia entre que el botón funcione en un iPhone o no.
    const rango = document.createRange();
    rango.selectNodeContents(area);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    area.setSelectionRange(0, texto.length);

    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/**
 * Enlace para compartir por WhatsApp.
 *
 * Es SOLO una URL: no usa navigator.share ni el portapapeles, así que funciona
 * sobre HTTP plano y en cualquier teléfono, incluido el iPhone donde
 * execCommand('copy') falla aun con gesto del usuario. Es lo que sostiene la
 * función mientras no haya dominio con HTTPS — y en Colombia es, de todas
 * formas, por donde la gente comparte de verdad.
 */
export function enlaceWhatsApp(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/**
 * Comparte por el menú nativo del sistema y, si no está disponible, copia el
 * enlace. Devuelve cómo terminó para que la interfaz diga la verdad:
 * 'compartido' | 'copiado' | 'cancelado' | 'fallo'.
 *
 * navigator.share también exige contexto seguro, así que sobre HTTP el camino
 * real es siempre el de copiar. Por eso el respaldo no es un adorno.
 */
export async function compartirEnlace({ titulo, texto, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto, url });
      return 'compartido';
    } catch (e) {
      // Cerrar la hoja de compartir lanza AbortError. No es un fallo y no debe
      // caer al respaldo: copiar algo que la persona decidió no compartir
      // sorprende más que no hacer nada.
      if (e?.name === 'AbortError') return 'cancelado';
    }
  }

  return (await copiarTexto(url)) ? 'copiado' : 'fallo';
}
