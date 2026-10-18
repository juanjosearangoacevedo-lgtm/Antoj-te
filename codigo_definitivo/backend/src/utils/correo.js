// Envío de correo transaccional por Resend (https://resend.com/docs/api-reference/emails/send-email).
//
// Por la API HTTP y con fetch, sin librería: es una sola petición, y así no se
// suma una dependencia ni un servidor SMTP que configurar.
//
// Sin RESEND_API_KEY no se envía nada. En desarrollo el correo se escribe en la
// consola (con su enlace), para poder probar el flujo sin cuenta en Resend. En
// producción solo se avisa de que falta la llave: el contenido lleva enlaces de
// un solo uso y no debe acabar en los logs.

const API = 'https://api.resend.com/emails';

// El dominio del remitente tiene que estar verificado en Resend (registros DNS
// en Cloudflare). Hasta entonces Resend solo deja enviar desde onboarding@resend.dev.
const remitente = () => process.env.CORREO_REMITENTE || 'Antojate <no-responder@bitemo.co>';

const configurado = () => Boolean(process.env.RESEND_API_KEY);

// Devuelve true si Resend lo aceptó. No lanza: quien llama decide si un fallo
// de correo es grave, y en recuperar contraseña no debe notarse desde fuera.
async function enviarCorreo({ para, asunto, html, texto }) {
  if (!configurado()) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[correo] RESEND_API_KEY no está configurada: no se envió "${asunto}".`);
    } else {
      console.log(`[correo] (sin RESEND_API_KEY, no se envía)\n  Para: ${para}\n  Asunto: ${asunto}\n\n${texto}\n`);
    }
    return false;
  }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: remitente(), to: [para], subject: asunto, html, text: texto }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      // El cuerpo de error de Resend dice qué pasó (dominio sin verificar, llave
      // mala…) y no lleva el contenido del correo, así que sí va al log.
      console.error(`[correo] Resend respondió ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[correo] no se pudo contactar a Resend: ${err.message}`);
    return false;
  }
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escaparHtml = (texto) => String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);

// Plantilla de correo transaccional con un botón: saludo, párrafos, botón y una
// nota final. Devuelve la versión HTML y la de texto plano (los filtros de spam
// desconfían de un correo que solo trae HTML).
//
// Estilos en línea y tablas: es lo único que respetan todos los clientes de
// correo. Botón verde de marca (#1B7D52) con texto blanco: 5.1:1, pasa el contraste AA.
function correoConBoton({ saludo, parrafos, boton, nota }) {
  const texto = [saludo, '', ...parrafos.flatMap((p) => [p, '']), `${boton.texto}: ${boton.url}`, '', nota, '', '— El equipo de Antojate']
    .filter((l) => l !== undefined)
    .join('\n');

  const p = (t, estilo) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;${estilo || ''}">${escaparHtml(t)}</p>`;
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#fff6e6;font-family:Arial,Helvetica,sans-serif;color:#2b1b12">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:22px;font-weight:bold;color:#1f8a5b">Antojate</p>
${p(saludo)}
${parrafos.map((t) => p(t)).join('\n')}
<p style="margin:8px 0 24px"><a href="${escaparHtml(boton.url)}" style="display:inline-block;background:#1b7d52;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:12px">${escaparHtml(boton.texto)}</a></p>
${nota ? p(nota, 'font-size:13px;color:#6b5545') : ''}
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { html, texto };
}

// Plantilla con un código de un solo uso (la app móvil). Misma estructura que la
// del botón, pero el protagonista es el código: grande, con los dígitos
// espaciados para leerlo de un vistazo y copiarlo a mano. El código NO va en el
// asunto: se vería en la pantalla de bloqueo de cualquiera que tenga el teléfono.
// Colores de la marca, como la del botón; el código va en tinto sobre un verde
// muy claro.
function correoConCodigo({ saludo, parrafos, codigo, nota }) {
  const texto = [saludo, '', ...parrafos.flatMap((p) => [p, '']), `Tu código: ${codigo}`, '', nota, '', '— El equipo de Antojate']
    .filter((l) => l !== undefined)
    .join('\n');

  const p = (t, estilo) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;${estilo || ''}">${escaparHtml(t)}</p>`;
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#fff6e6;font-family:Arial,Helvetica,sans-serif;color:#2b1b12">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:22px;font-weight:bold;color:#1f8a5b">Antojate</p>
${p(saludo)}
${parrafos.map((t) => p(t)).join('\n')}
<p style="margin:8px 0 24px;font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',Courier,monospace;color:#2b1b12;background:#e8f5ee;border-radius:12px;padding:16px;text-align:center">${escaparHtml(codigo)}</p>
${nota ? p(nota, 'font-size:13px;color:#6b5545') : ''}
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { html, texto };
}

module.exports = { enviarCorreo, configurado, correoConBoton, correoConCodigo, escaparHtml };
