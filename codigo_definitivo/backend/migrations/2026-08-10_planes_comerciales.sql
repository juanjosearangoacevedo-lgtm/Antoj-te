-- ============================================================
-- Planes: los campos que la landing necesita para venderlos
-- ============================================================
-- `planes` tenía solo nombre, precio y descripción. La landing no puede pintar
-- una tabla de precios con eso: le falta el orden, cuál destacar, cuál está a la
-- venta y qué incluye cada uno.
--
-- IMPORTANTE — dos conceptos distintos que NO se mezclan:
--   · `plan_features`      → interruptores TÉCNICOS (menu, carrito, kds…). Los lee
--                            `requireFeature` para dejar pasar o no una petición.
--   · `plan_caracteristicas` → texto COMERCIAL ("Hasta 50 platos con video"). Solo
--                            se pinta. Meter los dos en la misma tabla obligaría a
--                            elegir entre un flag que el código entiende y una
--                            frase que el cliente entiende, y se perdería una.
--
-- NO se añade "almacenamiento": el video vive en Bunny y hoy nada mide ni limita
-- el consumo por restaurante. Una columna que no se puede hacer cumplir es un
-- número inventado en la landing.
--
-- Idempotente: se puede volver a correr sin romper nada.

-- ---- Columnas nuevas en `planes` ----
SET @db := DATABASE();

-- slug: identificador estable para la URL y para el ancla de la landing. El
-- nombre puede cambiar por marketing; el slug no debería.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='slug');
SET @sql := IF(@existe=0, 'ALTER TABLE planes ADD COLUMN slug VARCHAR(60) NULL AFTER nombre', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='precio_anual');
SET @sql := IF(@existe=0,
  'ALTER TABLE planes ADD COLUMN precio_anual DECIMAL(10,2) NULL AFTER precio', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Límites del plan. NULL = sin límite, que es distinto de 0 (= ninguno permitido).
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='limite_platos');
SET @sql := IF(@existe=0, 'ALTER TABLE planes ADD COLUMN limite_platos INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='limite_usuarios');
SET @sql := IF(@existe=0, 'ALTER TABLE planes ADD COLUMN limite_usuarios INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='orden');
SET @sql := IF(@existe=0, 'ALTER TABLE planes ADD COLUMN orden INT NOT NULL DEFAULT 0', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='destacado');
SET @sql := IF(@existe=0,
  'ALTER TABLE planes ADD COLUMN destacado TINYINT(1) NOT NULL DEFAULT 0', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- activo: quita el plan de la landing SIN borrarlo. Borrarlo es imposible en
-- cuanto un restaurante lo usa (lo impide `contarUsos`), y retirar de la venta un
-- plan que sigue teniendo clientes es justo lo normal.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='activo');
SET @sql := IF(@existe=0,
  'ALTER TABLE planes ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---- Tabla de características comerciales ----
-- La FK usa el tipo REAL de `planes.id` leído de information_schema: la base local
-- y la de producción difieren en INT / INT UNSIGNED, y un tipo fijo aquí funciona
-- en un entorno y falla en el otro con ERROR 3780.
SET @tipo := (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND COLUMN_NAME='id');

SET @sql := CONCAT(
  'CREATE TABLE IF NOT EXISTS plan_caracteristicas (',
  '  id INT AUTO_INCREMENT PRIMARY KEY,',
  '  plan_id ', @tipo, ' NOT NULL,',
  '  texto VARCHAR(160) NOT NULL,',
  '  orden INT NOT NULL DEFAULT 0,',
  '  KEY idx_caract_plan (plan_id, orden),',
  '  CONSTRAINT fk_caract_plan FOREIGN KEY (plan_id) REFERENCES planes (id) ON DELETE CASCADE',
  ') ENGINE=InnoDB'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---- Relleno de los tres planes que ya existen ----
-- Sin esto la landing saldría con planes sin orden ni slug. Solo toca las filas
-- que aún no lo tienen, así que no pisa nada configurado a mano.
UPDATE planes SET slug = 'basico',      orden = 1, destacado = 0 WHERE nombre = 'Básico'      AND slug IS NULL;
UPDATE planes SET slug = 'intermedio',  orden = 2, destacado = 0 WHERE nombre = 'Intermedio'  AND slug IS NULL;
UPDATE planes SET slug = 'pro',         orden = 3, destacado = 1 WHERE nombre = 'Pro'         AND slug IS NULL;

-- Slug de emergencia para cualquier plan creado a mano que se quedara sin él.
UPDATE planes SET slug = CONCAT('plan-', id) WHERE slug IS NULL OR slug = '';

-- El índice único va DESPUÉS del relleno: antes habría chocado con los NULL
-- repetidos si alguien tuviera varios planes sin slug.
SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='planes' AND INDEX_NAME='uq_plan_slug');
SET @sql := IF(@existe=0, 'ALTER TABLE planes ADD UNIQUE KEY uq_plan_slug (slug)', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Precio anual: dos meses de regalo sobre el mensual, redondeado al millar.
-- Es un punto de partida editable desde el panel, no una regla del sistema.
UPDATE planes SET precio_anual = ROUND(precio * 10 / 1000) * 1000
  WHERE precio_anual IS NULL AND precio > 0;
