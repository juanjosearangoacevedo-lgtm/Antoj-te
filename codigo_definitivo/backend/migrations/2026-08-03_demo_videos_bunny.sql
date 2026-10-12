-- ============================================================================
-- Conecta el menú demo con los videos REALES que ya viven en Bunny Stream.
--
-- QUÉ ARREGLA
-- `bitemo_completo.sql` sembraba los 12 platos con URLs de ejemplo alojadas en
-- storage.googleapis.com/coverr-main/. Ese bucket dejó de ser público y hoy
-- responde 403 a todo, así que el menú del comensal no reproducía nada y las
-- categorías salían sin vista previa: video_thumbnail_url e imagen_url estaban
-- en NULL, de modo que el <video> tampoco tenía poster que mostrar.
--
-- El demo es lo primero que ve un restaurante. Depender de un CDN ajeno que
-- puede cambiar sus permisos sin avisar —y romper la demostración de venta en
-- silencio— no es aceptable. Los videos pasan a servirse desde Bunny, que es
-- infraestructura propia y la misma que usarán los clientes reales.
--
-- DE DÓNDE SALEN LOS GUID
-- De la biblioteca 710666, donde ya estaban subidos y transcodificados
-- (status 4 = terminado). Se reaprovechan los 12 que corresponden a comida; el
-- decimotercero es una prueba de WhatsApp y se deja fuera.
--
-- Los nombres y descripciones se reescriben para que coincidan con lo que de
-- verdad se ve en cada video: un plato llamado "Carpaccio de Res" sobre un
-- video de hamburguesa deja peor impresión que no tener video.
--
-- FORMATO DE LAS URLS
-- Es el mismo que arma `bunny.service.js` al registrar una subida, así que un
-- video cargado desde el panel queda idéntico a estos:
--   video_url           -> https://<cdn>/<guid>/playlist.m3u8   (HLS adaptativo)
--   video_thumbnail_url -> https://<cdn>/<guid>/thumbnail.jpg   (poster)
--
-- OJO CON EL CDN: el hostname `vz-243cff12-4eb.b-cdn.net` es el pull zone de
-- ESTA biblioteca. Si algún día se migra a otra, hay que reescribir estas 12
-- filas además de cambiar el .env.
--
-- NOTA SOBRE EL 403 QUE PUEDE APARECER AL PROBAR CON curl
-- La biblioteca tiene activado el bloqueo de peticiones sin `Referer`. Un
-- navegador siempre lo manda, así que la reproducción funciona; `curl` sin
-- `-e <origen>` recibe 403 y NO significa que el video esté roto.
-- ============================================================================

-- ---- Entradas ----
UPDATE platos SET
  nombre = 'Croquetas de Queso Costeño',
  descripcion = 'Croquetas cremosas de queso costeño, doradas al momento y servidas con alioli suave de ajo asado.',
  precio = 18000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/62fe597d-4af9-4ebf-9f72-f6cc59bc9464/playlist.m3u8',
  video_guid = '62fe597d-4af9-4ebf-9f72-f6cc59bc9464',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/62fe597d-4af9-4ebf-9f72-f6cc59bc9464/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 100;

UPDATE platos SET
  nombre = 'Patacón con Hogao y Queso',
  descripcion = 'Patacón crujiente coronado con hogao de la casa y queso fundido. Para compartir.',
  precio = 16000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/9229e8bd-d02c-453e-89d6-5a5b71fb2e9d/playlist.m3u8',
  video_guid = '9229e8bd-d02c-453e-89d6-5a5b71fb2e9d',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/9229e8bd-d02c-453e-89d6-5a5b71fb2e9d/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 101;

UPDATE platos SET
  nombre = 'Alitas al Tamarindo Picante',
  descripcion = 'Alitas glaseadas en tamarindo con un toque de ají. Dulces al principio, picantes al final.',
  precio = 26000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/6eed3ebd-8edc-4460-b283-8b0ae5a88760/playlist.m3u8',
  video_guid = '6eed3ebd-8edc-4460-b283-8b0ae5a88760',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/6eed3ebd-8edc-4460-b283-8b0ae5a88760/thumbnail.jpg',
  video_status = 'listo',
  nivel_picante = 2
WHERE id = 102;

-- ---- Platos Fuertes ----
UPDATE platos SET
  nombre = 'Doble Bitemo Burger',
  descripcion = 'Doble carne a la parrilla, queso fundido, tocineta y salsa de la casa en pan brioche.',
  precio = 34000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/e8c5378e-c861-455b-9248-e4c1b2c6f649/playlist.m3u8',
  video_guid = 'e8c5378e-c861-455b-9248-e4c1b2c6f649',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/e8c5378e-c861-455b-9248-e4c1b2c6f649/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 103;

UPDATE platos SET
  nombre = 'Costillas BBQ a Fuego Lento',
  descripcion = 'Costillas de cerdo cocinadas seis horas, glaseadas en BBQ ahumado. Se desprenden solas del hueso.',
  precio = 52000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/cb391aa3-f758-474f-8acb-ec6cb722319c/playlist.m3u8',
  video_guid = 'cb391aa3-f758-474f-8acb-ec6cb722319c',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/cb391aa3-f758-474f-8acb-ec6cb722319c/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 104;

UPDATE platos SET
  nombre = 'Salmón con Mantequilla de Limón',
  descripcion = 'Lomo de salmón sellado, bañado en mantequilla de limón y hierbas frescas.',
  precio = 48000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/089f2751-3aa3-44ab-a3b1-4b8ad3504c96/playlist.m3u8',
  video_guid = '089f2751-3aa3-44ab-a3b1-4b8ad3504c96',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/089f2751-3aa3-44ab-a3b1-4b8ad3504c96/thumbnail.jpg',
  video_status = 'listo',
  nivel_picante = 0
WHERE id = 105;

-- ---- Postres ----
UPDATE platos SET
  nombre = 'Cheesecake de Frutos Rojos',
  descripcion = 'Base de galleta artesanal, queso crema horneado y coulis de frutos rojos.',
  precio = 18000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/9a2ceb15-c173-4682-baa7-fb1249af8e5f/playlist.m3u8',
  video_guid = '9a2ceb15-c173-4682-baa7-fb1249af8e5f',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/9a2ceb15-c173-4682-baa7-fb1249af8e5f/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 106;

UPDATE platos SET
  nombre = 'Volcán de Chocolate',
  descripcion = 'Bizcocho tibio de chocolate 70% con centro líquido y helado de vainilla.',
  precio = 19000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/9d09c91c-1476-46b3-8be0-2f3dc5446b46/playlist.m3u8',
  video_guid = '9d09c91c-1476-46b3-8be0-2f3dc5446b46',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/9d09c91c-1476-46b3-8be0-2f3dc5446b46/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 107;

UPDATE platos SET
  nombre = 'Churros con Arequipe',
  descripcion = 'Churros recién hechos, azucarados y con arequipe para mojar.',
  precio = 15000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/d98a7e37-4cbc-4930-988c-fa9c988fac8e/playlist.m3u8',
  video_guid = 'd98a7e37-4cbc-4930-988c-fa9c988fac8e',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/d98a7e37-4cbc-4930-988c-fa9c988fac8e/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 108;

-- ---- Bebidas ----
UPDATE platos SET
  nombre = 'Jugo de Maracuyá Natural',
  descripcion = 'Maracuyá exprimido al momento, sin azúcar añadida.',
  precio = 9000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/8f22adb1-eef1-4dc4-a403-3fe9639d1f17/playlist.m3u8',
  video_guid = '8f22adb1-eef1-4dc4-a403-3fe9639d1f17',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/8f22adb1-eef1-4dc4-a403-3fe9639d1f17/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 109;

UPDATE platos SET
  nombre = 'Limonada de Coco',
  descripcion = 'Limón, leche de coco y hielo, batidos hasta quedar cremosos.',
  precio = 12000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/4c07db21-7487-451a-aa36-581334b9bab3/playlist.m3u8',
  video_guid = '4c07db21-7487-451a-aa36-581334b9bab3',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/4c07db21-7487-451a-aa36-581334b9bab3/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 110;

UPDATE platos SET
  nombre = 'Malteada de Oreo',
  descripcion = 'Helado de vainilla, galleta Oreo y crema batida. Se toma con cuchara.',
  precio = 16000,
  video_url = 'https://vz-243cff12-4eb.b-cdn.net/50ae8520-8cef-4b4f-9c83-67a65a7d7a9d/playlist.m3u8',
  video_guid = '50ae8520-8cef-4b4f-9c83-67a65a7d7a9d',
  video_thumbnail_url = 'https://vz-243cff12-4eb.b-cdn.net/50ae8520-8cef-4b4f-9c83-67a65a7d7a9d/thumbnail.jpg',
  video_status = 'listo'
WHERE id = 111;

-- Verificación: las 12 filas deben quedar con GUID y miniatura, y ninguna
-- conservando una URL de coverr.
SELECT COUNT(*) AS total,
       COUNT(video_guid) AS con_guid,
       COUNT(video_thumbnail_url) AS con_miniatura,
       SUM(video_url LIKE '%coverr%') AS urls_muertas
  FROM platos;
