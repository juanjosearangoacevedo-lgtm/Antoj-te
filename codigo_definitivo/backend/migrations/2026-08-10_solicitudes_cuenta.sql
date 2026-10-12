-- ============================================================
-- Solicitudes: de "dejame tus datos" a "creame la cuenta"
-- ============================================================
-- `solicitudes_demo` era un formulario de contacto: alguien dejaba su teléfono y
-- un humano lo llamaba. Ahora es una solicitud de cuenta de verdad — trae la
-- contraseña con la que entrará el dueño y, al aprobarla, el sistema crea el
-- restaurante y su usuario. Se EXTIENDE la tabla en vez de crear una paralela:
-- las dos cosas son "alguien de fuera pidiendo entrar", y separarlas obligaría a
-- mantener dos bandejas de entrada.
--
-- Las solicitudes viejas conviven sin tocarlas: se quedan con password_hash NULL
-- y siguen su ciclo nueva → contactada → cerrada.
--
-- SIN claves ajenas, igual que decidió la migración original de esta tabla. Aquí
-- hay una razón extra: estas columnas son la BITÁCORA de quién aprobó qué. Si un
-- restaurante se borra, el registro de su aprobación tiene que sobrevivir, no
-- desaparecer en cascada. Y de paso se esquiva el desfase INT / INT UNSIGNED
-- entre la base local y la de producción.
--
-- Idempotente: se puede volver a correr.

SET @db := DATABASE();

-- Contraseña ya cifrada. NULL = solicitud del formulario de contacto antiguo.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='password_hash');
SET @sql := IF(@existe=0,
  'ALTER TABLE solicitudes_demo ADD COLUMN password_hash VARCHAR(255) NULL AFTER email', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Plan que eligió en la landing. Es una preferencia, no un compromiso: el
-- superadmin puede aprobar con otro.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='plan_id');
SET @sql := IF(@existe=0, 'ALTER TABLE solicitudes_demo ADD COLUMN plan_id INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Lo que se creó al aprobar. Sirve para no aprobar dos veces la misma solicitud
-- y para saber de qué solicitud salió cada restaurante.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='restaurante_id');
SET @sql := IF(@existe=0, 'ALTER TABLE solicitudes_demo ADD COLUMN restaurante_id INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='usuario_id');
SET @sql := IF(@existe=0, 'ALTER TABLE solicitudes_demo ADD COLUMN usuario_id INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Quién la revisó y cuándo. Sin esto, "¿quién aprobó a este cliente?" no tiene
-- respuesta el día que haya varios administradores.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='revisada_por');
SET @sql := IF(@existe=0, 'ALTER TABLE solicitudes_demo ADD COLUMN revisada_por INT NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='revisada_en');
SET @sql := IF(@existe=0, 'ALTER TABLE solicitudes_demo ADD COLUMN revisada_en DATETIME NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND COLUMN_NAME='motivo_rechazo');
SET @sql := IF(@existe=0,
  'ALTER TABLE solicitudes_demo ADD COLUMN motivo_rechazo VARCHAR(500) NULL', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Dos estados nuevos. Se AÑADEN al ENUM conservando los tres viejos, para no
-- invalidar las filas que ya existen.
ALTER TABLE solicitudes_demo
  MODIFY COLUMN estado ENUM('nueva','contactada','cerrada','aprobada','rechazada')
  NOT NULL DEFAULT 'nueva';

-- El correo es la llave con la que entrará: buscarlo tiene que ser barato, tanto
-- al recibir la solicitud (¿ya la mandó?) como al aprobarla (¿ya es usuario?).
SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='solicitudes_demo' AND INDEX_NAME='idx_solicitud_email');
SET @sql := IF(@existe=0,
  'CREATE INDEX idx_solicitud_email ON solicitudes_demo (email)', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
