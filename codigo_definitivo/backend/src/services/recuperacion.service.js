const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const authModel = require('../models/auth.model');
const recuperacionModel = require('../models/recuperacion.model');
const { enviarCorreo } = require('../utils/correo');
const { BadRequestError } = require('../errors');
const sesiones = require('./sesiones.service');

// "Olvidé mi contraseña": se manda por correo un enlace de un solo uso y, con
// él, se pone una clave nueva sin conocer la anterior.
//
// Reglas que sostienen la seguridad:
//   - La respuesta de `solicitar` es IDÉNTICA exista o no el correo (y el envío
//     va en segundo plano, para que tampoco la delate el tiempo de respuesta).
//     Si no, el formulario serviría para averiguar qué correos tienen cuenta.
//   - En la base solo se guarda el SHA-256 del token.
//   - El enlace caduca en una hora y sirve una vez.

const VIGENCIA_MINUTOS = 60;
const MAX_POR_HORA = 3;
const RONDAS_BCRYPT = 10; // Las mismas que auth.service y usuarios.service.

const hashToken = (token) => crypto.createHash('sha256').update(token, 'utf8').digest('hex');

// Mismo criterio que el retorno de Wompi: en desarrollo el panel vive en Vite.
const urlSitio = () =>
  (
    process.env.SITIO_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://bitemo.co' : 'http://localhost:5173')
  ).replace(/\/$/, '');

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escaparHtml = (texto) => String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);

// El token va en el FRAGMENTO (#), no en la query: el navegador nunca manda el
// fragmento al servidor, así que no queda escrito en los logs de Nginx ni de
// Cloudflare. Lo lee el frontend y lo manda en el cuerpo de un POST.
const enlaceRestablecer = (token) => `${urlSitio()}/restablecer#token=${token}`;

function plantilla(nombre, enlace) {
  const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';
  const texto = [
    saludo,
    '',
    'Recibimos una solicitud para cambiar la contraseña de tu cuenta de Bitemo.',
    'Abre este enlace para elegir una nueva (vale por una hora y sirve una sola vez):',
    '',
    enlace,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.',
    '',
    '— El equipo de Bitemo',
  ].join('\n');

  // Estilos en línea y tablas: es lo único que respetan todos los clientes de
  // correo. Botón naranja de marca con texto oscuro (blanco sobre naranja no
  // pasa el contraste AA).
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1d1e22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:bold">Bitemo</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escaparHtml(saludo)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5">Recibimos una solicitud para cambiar la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.</p>
<p style="margin:0 0 24px"><a href="${escaparHtml(enlace)}" style="display:inline-block;background:#ff7a00;color:#1f1200;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:12px">Elegir contraseña nueva</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#52525b">El enlace vale por una hora y sirve una sola vez. Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;word-break:break-all">Si el botón no funciona, copia este enlace en tu navegador:<br>${escaparHtml(enlace)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { texto, html };
}

// Trabajo real de `solicitar`. Quien lo llama no espera su resultado.
async function procesarSolicitud(email, ip) {
  const usuario = await authModel.buscarUsuarioPorEmail(email);
  if (!usuario) return;

  if ((await recuperacionModel.contarRecientes(usuario.id, 60)) >= MAX_POR_HORA) return;

  const token = crypto.randomBytes(32).toString('base64url');
  await recuperacionModel.crear({
    usuarioId: usuario.id,
    tokenHash: hashToken(token),
    minutos: VIGENCIA_MINUTOS,
    ip,
  });

  const { texto, html } = plantilla(usuario.nombre, enlaceRestablecer(token));
  await enviarCorreo({ para: usuario.email, asunto: 'Cambia tu contraseña de Bitemo', html, texto });
}

const solicitar = (email, ip) => {
  procesarSolicitud(email, ip).catch((err) =>
    console.error(`[recuperacion] no se pudo procesar la solicitud: ${err.message}`)
  );
  return {
    mensaje: 'Si ese correo tiene una cuenta en Bitemo, te enviamos un enlace para cambiar la contraseña.',
  };
};

// Restablecer cierra todas las sesiones abiertas de la cuenta: si alguien entró
// con la clave vieja, se queda fuera en su siguiente petición.
const restablecer = async (token, password) => {
  const invalido = () => new BadRequestError('El enlace no es válido o ya caducó. Pide uno nuevo.');
  const tokenHash = hashToken(token);

  // Primero sin candado, y el bcrypt (lento) fuera de la transacción: así un
  // enlace falso no abre una transacción ni retiene filas mientras se calcula.
  if (!(await recuperacionModel.buscarVigente(tokenHash))) throw invalido();
  const hash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fila = await recuperacionModel.buscarVigente(tokenHash, conn, { bloquear: true });
    if (!fila) throw invalido();

    const cambiadas = await authModel.guardarPassword(fila.usuario_id, hash, conn);
    if (cambiadas === 0) throw invalido(); // El usuario se borró después de pedir el enlace.

    await recuperacionModel.anularDeUsuario(fila.usuario_id, conn);
    await sesiones.revocar(fila.usuario_id, conn);
    await conn.commit();
    sesiones.olvidar(fila.usuario_id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { restablecida: true };
};

module.exports = { solicitar, restablecer, hashToken, enlaceRestablecer };
