import { useEffect } from 'react';

/**
 * Cambia el <title> mientras la vista está montada y lo restaura al salir.
 *
 * Hace falta porque el <title> de index.html está redactado para posicionar la
 * landing en Google ("Menú digital con QR y video para restaurantes | Bitemo").
 * Como es un SPA, ese título lo hereda CUALQUIER ruta si nadie lo cambia: el
 * comensal que escanea un QR vería un texto de venta en la pestaña en lugar de
 * la marca de su restaurante, que es justo lo contrario de lo que promete la
 * plataforma.
 *
 * Pasa `null` para no tocar nada (por ejemplo mientras aún se carga el dato).
 */
export function useTituloPagina(titulo) {
  useEffect(() => {
    if (!titulo) return undefined;
    const anterior = document.title;
    document.title = titulo;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
