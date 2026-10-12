-- ============================================================
-- Fecha de última modificación en platos y restaurantes
-- ============================================================
-- Es lo que permite poner <lastmod> en /sitemap-restaurantes.xml: la fecha en
-- que cambió de verdad la carta, para que Google vuelva a rastrear la vitrina
-- cuando hay algo nuevo y no la visite en balde cuando no lo hay.
--
-- MySQL la mantiene sola (ON UPDATE CURRENT_TIMESTAMP): cualquier UPDATE que
-- cambie algún valor de la fila la mueve, sin tocar el código de los models.
--
-- Las filas que ya existen arrancan con su `creado_en`, NO con la fecha de hoy.
-- Si todas nacieran "modificadas hoy", el primer sitemap diría que todo cambió
-- a la vez, y Google deja de creerse el lastmod de un sitio que miente así.
-- (El UPDATE asigna la columna explícitamente, así que ON UPDATE no la pisa.)
--
-- Idempotente: se puede volver a correr. El UPDATE solo corre al crear la
-- columna, para no borrar fechas reales en una segunda pasada.

SET @db := DATABASE();

-- platos
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='platos' AND COLUMN_NAME='actualizado_en');
SET @sql := IF(@existe=0,
  'ALTER TABLE platos ADD COLUMN actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF(@existe=0, 'UPDATE platos SET actualizado_en = creado_en', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- restaurantes
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='restaurantes' AND COLUMN_NAME='actualizado_en');
SET @sql := IF(@existe=0,
  'ALTER TABLE restaurantes ADD COLUMN actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF(@existe=0, 'UPDATE restaurantes SET actualizado_en = creado_en', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
