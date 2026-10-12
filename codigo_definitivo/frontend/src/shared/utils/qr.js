import QRCode from 'qrcode';

// URL pública del menú del comensal para una mesa (lo que codifica el QR).
// Los QR impresos con la ruta anterior (`/?mesa=`) siguen funcionando: el router
// los redirige a /menu conservando el parámetro.
export const urlMesa = (token) => `${window.location.origin}/menu?mesa=${token}`;

// Carta pública del restaurante, sin mesa: la que se comparte en redes y la
// única que tiene sentido que indexe un buscador.
export const urlVitrina = (slug) => `${window.location.origin}/r/${slug}`;

// Genera un PNG del QR como data URL, listo para <img>, descarga o impresión.
export function generarQrDataUrl(texto, tamano = 480) {
  return QRCode.toDataURL(texto, {
    width: tamano,
    margin: 2,
    color: { dark: '#1a1611', light: '#ffffff' },
  });
}

export function descargarDataUrl(dataUrl, nombreArchivo) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Abre una ventana con una tarjeta de mesa lista para imprimir (QR + nombre + mesa).
//
// Devuelve false si el navegador bloqueó la ventana emergente, para que quien
// llama pueda decirlo. Antes salía en silencio: el botón "Imprimir" no hacía
// absolutamente nada y no había forma de saber por qué —y el bloqueo es lo
// normal en el móvil, que es donde el mesero tiene el panel abierto.
export function imprimirTarjetas(restauranteNombre, tarjetas) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return false;

  const piezas = tarjetas
    .map(
      (t) => `
    <section class="tarjeta">
      <div class="marca">${restauranteNombre}</div>
      <img src="${t.dataUrl}" alt="QR mesa ${t.numero}" />
      <div class="mesa">Mesa ${t.numero}</div>
      <div class="ayuda">Escanea para ver el menú y pedir</div>
    </section>`
    )
    .join('');

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Códigos QR — ${restauranteNombre}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .tarjeta {
            border: 2px dashed #ccc;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            page-break-inside: avoid;
          }
          .marca { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #666; margin-bottom: 12px; }
          .tarjeta img { width: 100%; max-width: 260px; height: auto; }
          .mesa { font-size: 22px; font-weight: 700; margin-top: 14px; }
          .ayuda { font-size: 12px; color: #777; margin-top: 4px; }
          @media print {
            body { padding: 0; }
            .tarjeta { border: 1px solid #ddd; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${piezas}</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
  return true;
}
