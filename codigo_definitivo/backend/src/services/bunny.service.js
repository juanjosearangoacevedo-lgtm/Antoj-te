const crypto = require('crypto');
const { ApiError } = require('../errors');

// Integración con Bunny Stream.
// La AccessKey (secreta) SOLO se usa aquí, en el servidor. El navegador nunca la ve:
// para subir, le firmamos una credencial temporal (TUS) con vencimiento a 1 hora.
//
// Config en .env:
//   BUNNY_STREAM_LIBRARY_ID     -> id numérico de la Stream Library
//   BUNNY_STREAM_API_KEY        -> AccessKey de esa library
//   BUNNY_STREAM_CDN_HOSTNAME   -> hostname del pull zone, ej. vz-abcd1234.b-cdn.net

const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

// Se lee de forma perezosa (no en el top-level) para no depender del orden de carga de dotenv.
function cfg() {
  return {
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
    apiKey: process.env.BUNNY_STREAM_API_KEY,
    cdnHost: process.env.BUNNY_STREAM_CDN_HOSTNAME,
  };
}

function assertConfigurado() {
  const { libraryId, apiKey, cdnHost } = cfg();
  if (!libraryId || !apiKey || !cdnHost) {
    throw new ApiError(
      500,
      'Bunny Stream no está configurado. Revisa BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY y BUNNY_STREAM_CDN_HOSTNAME en el .env del backend.'
    );
  }
  return cfg();
}

// Llamada base a la API de administración de Bunny Stream.
async function bunnyApi(path, options = {}) {
  const { libraryId, apiKey } = assertConfigurado();
  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}${path}`, {
    ...options,
    headers: {
      AccessKey: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new ApiError(502, `Error al comunicarse con Bunny (${res.status}). ${detalle}`.trim());
  }
  const tipo = res.headers.get('content-type') || '';
  return tipo.includes('application/json') ? res.json() : null;
}

// URLs públicas de reproducción. Son deterministas a partir del guid,
// así que las conocemos apenas se crea el video (antes de terminar de procesar).
function construirUrls(guid) {
  const { cdnHost } = cfg();
  return {
    video_url: `https://${cdnHost}/${guid}/playlist.m3u8`, // HLS adaptativo
    video_thumbnail_url: `https://${cdnHost}/${guid}/thumbnail.jpg`,
  };
}

// Crea una colección (una por restaurante) y devuelve su guid.
async function crearColeccion(nombre) {
  const col = await bunnyApi('/collections', {
    method: 'POST',
    body: JSON.stringify({ name: nombre }),
  });
  return col.guid;
}

// 1) Crea el objeto de video en Bunny.
// 2) Firma una credencial TUS temporal para que el navegador suba directo.
async function crearSubida(titulo, collectionId) {
  const { libraryId, apiKey } = assertConfigurado();

  const body = { title: titulo || 'Video de plato' };
  if (collectionId) body.collectionId = collectionId;
  const video = await bunnyApi('/videos', { method: 'POST', body: JSON.stringify(body) });
  const guid = video.guid;

  // Firma TUS: sha256(libraryId + apiKey + expiration + videoId)
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60; // vence en 1 h
  const signature = crypto
    .createHash('sha256')
    .update(String(libraryId) + apiKey + expiration + guid)
    .digest('hex');

  return {
    videoGuid: guid,
    libraryId: String(libraryId),
    tusEndpoint: TUS_ENDPOINT,
    signature,
    expiration,
    ...construirUrls(guid),
  };
}

// Estado de procesamiento en Bunny -> nuestro enum.
// 0 Created · 1 Uploaded · 2 Processing · 3 Transcoding · 4 Finished · 5 Error · 6 UploadFailed
const MAPA_ESTADO = { 0: 'procesando', 1: 'procesando', 2: 'procesando', 3: 'procesando', 4: 'listo', 5: 'error', 6: 'error' };

async function estado(guid) {
  const video = await bunnyApi(`/videos/${guid}`);
  return {
    estado: MAPA_ESTADO[video.status] ?? 'procesando',
    bunnyStatus: video.status,
    duracion: video.length || 0,
  };
}

// Borra el video en Bunny. No lanza: si falla, no debe abortar la operación
// principal (ej. eliminar el plato en la BD). Se registra para limpieza posterior.
async function eliminar(guid) {
  if (!guid) return;
  try {
    await bunnyApi(`/videos/${guid}`, { method: 'DELETE' });
  } catch (err) {
    console.error(`[bunny] No se pudo eliminar el video ${guid}:`, err.message);
  }
}

module.exports = {
  crearColeccion,
  crearSubida,
  estado,
  eliminar,
  construirUrls,
};
