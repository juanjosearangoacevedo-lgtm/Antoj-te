-- ============================================================================
-- App móvil, fase 2: el feed y su capa social
--
-- Lo que necesita el feed vertical de la app (APP_MOVIL.md §22, fase 2) sin
-- tocar lo que ya funciona: /api/public, el menú por QR y el panel siguen
-- leyendo y escribiendo lo mismo.
--
--   1. `platos`              + en_feed, publicado_en, duracion_segundos y el
--                              índice del feed.
--   2. `plan_features`       + 'app_publica' en todos los planes (decisión de la
--                              fase 2: el feed necesita catálogo).
--   3. `favoritos`           + comensal_id: los "me gusta" de una cuenta.
--   4. `guardados`           platos que alguien guarda para después.
--   5. `comentarios`         con `comentario_reportes` y `comensal_bloqueos`:
--                              sin reportar ni bloquear no hay comentarios
--                              (App Store 1.2).
--   6. `eventos_app`         señales del feed (vistas, tiempo visto…), aparte
--                              de la analítica del restaurante.
--
-- REQUISITOS: 2026-09-29_comensales.sql (las cuentas) y 2026-09-15_saneo_esquema.sql
-- (el registro de migraciones y la unicidad de `favoritos`). Si falta alguno, el
-- archivo se detiene al principio, antes de tocar nada.
--
-- TIPOS. `platos.id` es INT UNSIGNED en la base local e INT en producción (ver
-- bases divergentes). Toda columna que apunte a `platos` copia el tipo REAL de
-- platos.id: con el tipo equivocado, la clave ajena no se crea.
--
-- IDEMPOTENTE: cada paso consulta information_schema antes de tocar nada.
-- Aplicar SIEMPRE con --default-character-set=utf8mb4 (ver init-db.sh).
-- ============================================================================

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 0. Requisitos. Fuera de un procedimiento MySQL no tiene SIGNAL, así que se
--    detiene con una consulta a una tabla que no existe y cuyo nombre dice qué
--    falta: el error ("Table '…aplica_antes_…' doesn't exist") se explica solo.
-- ---------------------------------------------------------------------------

SET @hay := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'comensales');
SET @sql := IF(@hay = 0, 'SELECT 1 FROM aplica_antes_2026_09_29_comensales', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @hay := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'migraciones_aplicadas');
SET @sql := IF(@hay = 0, 'SELECT 1 FROM aplica_antes_2026_09_15_saneo_esquema', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @tipo_plato := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'platos' AND COLUMN_NAME = 'id'
);


-- ---------------------------------------------------------------------------
-- 1. `platos`
--
-- en_feed            "Aparece en la app". Nace en 1: un plato publicado en la
--                    carta sale también en la app salvo que el restaurante lo
--                    quite. Al revés, el feed arrancaría vacío.
-- publicado_en       Cuándo entró al feed: el orden es "lo más reciente
--                    primero", y `creado_en` no sirve porque un plato puede
--                    llevar meses en la carta y estrenar video hoy. Lo escribe
--                    el model cuando el video queda listo.
-- duracion_segundos  La del video en Bunny, para saber si alguien lo vio entero.
--
-- No se añade `restaurante_id` (APP_MOVIL.md §18 lo proponía): el feed lo saca
-- de `categorias` por clave primaria, y una copia en `platos` habría que
-- mantenerla al día en cada camino que crea o mueve un plato.
-- ---------------------------------------------------------------------------

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'platos' AND COLUMN_NAME = 'en_feed');
SET @sql := IF(@existe = 0, 'ALTER TABLE platos ADD COLUMN en_feed TINYINT(1) NOT NULL DEFAULT 1', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'platos' AND COLUMN_NAME = 'publicado_en');
SET @sql := IF(@existe = 0, 'ALTER TABLE platos ADD COLUMN publicado_en DATETIME NULL', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'platos' AND COLUMN_NAME = 'duracion_segundos');
SET @sql := IF(@existe = 0, 'ALTER TABLE platos ADD COLUMN duracion_segundos SMALLINT UNSIGNED NULL', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- Relleno: lo que ya tiene el video listo se da por publicado cuando se creó.
-- Solo toca filas en NULL, así que repetirlo no pisa fechas reales.
-- `actualizado_en = actualizado_en` evita que ON UPDATE CURRENT_TIMESTAMP marque
-- todos los platos como recién editados: esa fecha la lee el sitemap.
UPDATE platos
   SET publicado_en = creado_en, actualizado_en = actualizado_en
 WHERE publicado_en IS NULL AND video_status = 'listo';

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'platos' AND INDEX_NAME = 'idx_platos_feed');
SET @sql := IF(@existe = 0,
  'ALTER TABLE platos ADD INDEX idx_platos_feed (en_feed, activo, video_status, publicado_en)',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;


-- ---------------------------------------------------------------------------
-- 2. 'app_publica' en todos los planes que existan. Un plan creado después la
--    trae solo si el superadmin la marca (aparece en su catálogo de features).
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO plan_features (plan_id, feature)
SELECT id, 'app_publica' FROM planes;


-- ---------------------------------------------------------------------------
-- 3. `favoritos`: los "me gusta" de una cuenta
--
-- `sesion_token` pasa a ser la llave del DUEÑO del "me gusta":
--   · el UUID del navegador     (menú web, como siempre),
--   · el UUID del teléfono      (app sin cuenta),
--   · 'c:<id del comensal>'     (app con cuenta).
-- El índice único del saneo, (sesion_token, plato_k, combo_k), sirve así tal
-- cual para los tres: un dueño, un "me gusta" por plato. Las rutas públicas
-- rechazan cualquier token con ':', así que nadie puede tocar los de una cuenta
-- desde el menú web.
--
-- `comensal_id` repite el dueño cuando es una cuenta, para que borrar la cuenta
-- borre sus "me gusta" en cascada.
-- ---------------------------------------------------------------------------

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'favoritos' AND COLUMN_NAME = 'comensal_id');
SET @sql := IF(@existe = 0,
  'ALTER TABLE favoritos ADD COLUMN comensal_id INT UNSIGNED NULL AFTER sesion_token, ADD KEY idx_fav_comensal (comensal_id)',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'favoritos' AND CONSTRAINT_NAME = 'fk_fav_comensal');
SET @sql := IF(@existe = 0,
  'ALTER TABLE favoritos ADD CONSTRAINT fk_fav_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;


-- ---------------------------------------------------------------------------
-- 4. `guardados`: mismo convenio de dueño que `favoritos` (`dueno` = UUID del
--    teléfono o 'c:<id>'), y un plato se guarda una sola vez por dueño.
-- ---------------------------------------------------------------------------

SET @sql := CONCAT(
  'CREATE TABLE IF NOT EXISTS guardados (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     dueno VARCHAR(80) NOT NULL,
     comensal_id INT UNSIGNED NULL,
     plato_id ', @tipo_plato, ' NOT NULL,
     creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_guardado (dueno, plato_id),
     KEY idx_guardado_comensal (comensal_id),
     KEY idx_guardado_plato (plato_id),
     CONSTRAINT fk_guardado_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
     CONSTRAINT fk_guardado_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
   ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;


-- ---------------------------------------------------------------------------
-- 5. Comentarios, reportes y bloqueos
--
-- Comentar exige cuenta (decisión D6): sin identidad no se puede bloquear a
-- quien abusa. `estado` es 'visible' u 'oculto'; ocultar no borra, para que el
-- restaurante pueda deshacerlo. Borrar lo hace el autor (o el restaurante) y es
-- de verdad.
-- ---------------------------------------------------------------------------

SET @sql := CONCAT(
  'CREATE TABLE IF NOT EXISTS comentarios (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     plato_id ', @tipo_plato, ' NOT NULL,
     comensal_id INT UNSIGNED NOT NULL,
     texto VARCHAR(500) NOT NULL,
     estado VARCHAR(12) NOT NULL DEFAULT ''visible'',
     moderado_por INT UNSIGNED NULL,
     moderado_en DATETIME NULL,
     creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_comentario_plato (plato_id, estado, id),
     KEY idx_comentario_comensal (comensal_id, creado_en),
     CONSTRAINT fk_comentario_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
     CONSTRAINT fk_comentario_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
   ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- Una persona reporta un comentario una sola vez; con varios reportes de
-- personas distintas el comentario se oculta solo hasta que el restaurante lo
-- revise (el umbral vive en el service).
CREATE TABLE IF NOT EXISTS comentario_reportes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comentario_id INT UNSIGNED NOT NULL,
  comensal_id INT UNSIGNED NOT NULL,
  motivo VARCHAR(20) NOT NULL,
  detalle VARCHAR(300) NULL,
  resuelto_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reporte (comentario_id, comensal_id),
  KEY idx_reporte_comensal (comensal_id),
  CONSTRAINT fk_reporte_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_reporte_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Quien bloquea deja de ver los comentarios de la persona bloqueada.
CREATE TABLE IF NOT EXISTS comensal_bloqueos (
  comensal_id INT UNSIGNED NOT NULL,
  bloqueado_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comensal_id, bloqueado_id),
  KEY idx_bloqueo_bloqueado (bloqueado_id),
  CONSTRAINT fk_bloqueo_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE,
  CONSTRAINT fk_bloqueo_bloqueado FOREIGN KEY (bloqueado_id) REFERENCES comensales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 6. `eventos_app`: las señales del feed
--
-- Tabla aparte y no `analiticas_eventos_video`: esa mide el embudo del
-- restaurante en su mesa (vio, pidió), y mezclarle el feed de la app le
-- ensuciaría las cifras. `plato_id` va sin clave ajena (es analítica: un insert
-- por lote no debe frenarse por eso); `comensal_id` sí la lleva, para que borrar
-- la cuenta borre también lo que hizo con ella.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eventos_app (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dispositivo_id VARCHAR(64) NULL,
  comensal_id INT UNSIGNED NULL,
  plataforma VARCHAR(10) NULL,
  tipo VARCHAR(30) NOT NULL,
  plato_id INT UNSIGNED NULL,
  valor INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_evento_tipo (tipo, creado_en),
  KEY idx_evento_plato (plato_id, tipo),
  KEY idx_evento_comensal (comensal_id),
  CONSTRAINT fk_evento_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 7. Constancia en el registro.
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO migraciones_aplicadas (archivo, notas)
VALUES ('2026-10-12_app_feed.sql', 'App móvil, fase 2: feed, me gusta de cuenta, guardados, comentarios y eventos');
