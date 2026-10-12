-- ============================================================
-- Índices para las consultas de analítica
-- ============================================================
-- `analiticas_eventos_video` solo tenía idx_evento_plato (plato_id, tipo_evento),
-- que sirve para el embudo de UN plato pero no para nada acotado por fecha ni por
-- restaurante. Las pantallas de analítica siempre filtran por las dos cosas
-- (sucursal del restaurante + rango de fechas), así que sin estos índices cada
-- carga del panel hacía un recorrido completo de la tabla.
--
-- Solo se añaden índices: ninguna clave ajena nueva, así que aquí NO aplica el
-- desfase de tipos INT / INT UNSIGNED entre la base local y la de producción.
--
-- Idempotente: MySQL no admite CREATE INDEX IF NOT EXISTS, así que se consulta
-- information_schema y se salta el índice que ya exista. Se puede volver a correr.

-- Resumen y actividad: "todos los eventos de este restaurante en este rango".
SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'analiticas_eventos_video'
    AND INDEX_NAME = 'idx_evento_sucursal_fecha'
);
SET @sql := IF(@existe = 0,
  'CREATE INDEX idx_evento_sucursal_fecha ON analiticas_eventos_video (sucursal_id, creado_en)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Conteos por tipo de evento dentro de un rango (visitas, reproducciones, compras).
SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'analiticas_eventos_video'
    AND INDEX_NAME = 'idx_evento_tipo_fecha'
);
SET @sql := IF(@existe = 0,
  'CREATE INDEX idx_evento_tipo_fecha ON analiticas_eventos_video (tipo_evento, creado_en)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Los pedidos se agregan por fecha en todas las pantallas (hoy, últimos 30 días,
-- actividad por hora), y `pedidos` solo tenía índice por mesa_id.
SET @existe := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pedidos'
    AND INDEX_NAME = 'idx_pedido_fecha'
);
SET @sql := IF(@existe = 0,
  'CREATE INDEX idx_pedido_fecha ON pedidos (creado_en)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
