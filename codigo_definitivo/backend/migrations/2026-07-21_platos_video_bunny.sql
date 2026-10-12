-- ============================================================
-- Integración con Bunny Stream para los videos de los platos.
-- Ejecutar UNA sola vez sobre la base ya existente.
--   video_guid          -> id del video dentro de la Stream Library de Bunny
--   video_thumbnail_url -> miniatura autogenerada (se usa como poster del <video>)
--   video_status        -> 'procesando' mientras Bunny transcodifica; 'listo' al terminar
--   bunny_collection_id -> una colección de Bunny por restaurante (organización multi-tenant)
--
-- video_status arranca en 'listo' para no romper los platos que ya tengan
-- una URL puesta a mano (esos ya están reproducibles).
-- ============================================================

ALTER TABLE platos
  ADD COLUMN video_guid VARCHAR(64) NULL AFTER video_url,
  ADD COLUMN video_thumbnail_url VARCHAR(500) NULL AFTER video_guid,
  ADD COLUMN video_status ENUM('procesando', 'listo', 'error') NOT NULL DEFAULT 'listo' AFTER video_thumbnail_url;

ALTER TABLE restaurantes
  ADD COLUMN bunny_collection_id VARCHAR(64) NULL AFTER logo_url;
