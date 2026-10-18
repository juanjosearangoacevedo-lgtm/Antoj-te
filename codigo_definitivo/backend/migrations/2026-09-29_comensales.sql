-- ============================================================
-- Comensales: la cuenta del usuario final de la app móvil
-- ============================================================
-- Hasta hoy el comensal era anónimo: un UUID en el navegador identificaba su
-- carrito, sus "me gusta" y sus pedidos, y solo el staff tenía cuenta (tabla
-- `usuarios`). La app móvil necesita cuenta para reservar, y esa cuenta NO va
-- en `usuarios`, a propósito:
--   - en los models, `restaurante_id` nulo significa "sin acotar", que es el
--     alcance del superadmin; un comensal lo tendría nulo por naturaleza;
--   - el panel lista `usuarios` como "el equipo" del restaurante, y el correo es
--     único ahí: el dueño de un restaurante no podría ser comensal con su correo.
--
-- Tres tablas:
--   comensales           la cuenta: correo único y clave con bcrypt.
--   comensales_sesiones  una fila por dispositivo con sesión abierta. Guarda el
--                        SHA-256 del refresh token, nunca el token.
--   comensales_codigos   códigos de 6 dígitos que llegan por correo (verificar el
--                        correo, restablecer la clave), guardados con HMAC.
--
-- Las claves ajenas solo apuntan a `comensales`, que nace aquí con el tipo que
-- elegimos nosotros: el desfase INT / INT UNSIGNED entre la base local y la de
-- producción no aplica. Borrar la cuenta borra en cascada sesiones y códigos,
-- que es lo que exige "borrar de verdad" (App Store, Google Play y Ley 1581).
--
-- Las fechas de vencimiento se calculan y comparan SIEMPRE con NOW() de MySQL,
-- nunca con el reloj de Node: así da igual la zona horaria de cada contenedor.
--
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS comensales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  -- Se guarda en minúsculas (lo normaliza el validador). La collation ya compara
  -- sin distinguir mayúsculas; esto es para que el dato se lea igual en todas partes.
  email VARCHAR(160) NOT NULL,
  telefono VARCHAR(30) NULL,
  password_hash VARCHAR(100) NOT NULL,
  -- NULL = correo sin verificar. La cuenta funciona igual; lo que exija correo
  -- verificado (por ejemplo, confirmar una reserva) lo decide cada función.
  email_verificado_en DATETIME NULL,
  -- Cuándo aceptó los términos y la política de privacidad. Es la constancia del
  -- consentimiento que pide la Ley 1581: sin ella no se crea la cuenta.
  terminos_aceptados_en DATETIME NOT NULL,
  -- Misma idea que `usuarios.sesion_version`: cambiar o restablecer la clave la
  -- sube, y los tokens de acceso emitidos antes dejan de valer al instante.
  sesion_version INT UNSIGNED NOT NULL DEFAULT 0,
  ultimo_acceso_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comensal_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comensales_sesiones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comensal_id INT UNSIGNED NOT NULL,
  -- El refresh token rota en cada uso: `refresh_hash` es el vigente.
  refresh_hash CHAR(64) NOT NULL,
  -- El anterior sigue valiendo unos segundos tras rotar (`rotada_en`). Cubre el
  -- caso de un teléfono que pidió el token nuevo y perdió la respuesta al entrar
  -- en un túnel: sin esta gracia, la red móvil cerraría sesiones al azar.
  refresh_hash_anterior CHAR(64) NULL,
  rotada_en DATETIME NULL,
  -- El UUID que la app manda en X-Dispositivo, y 'ios' | 'android'.
  dispositivo_id VARCHAR(64) NULL,
  plataforma VARCHAR(20) NULL,
  expira_en DATETIME NOT NULL,
  revocada_en DATETIME NULL,
  ultimo_uso_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sesion_refresh (refresh_hash),
  KEY idx_sesion_refresh_anterior (refresh_hash_anterior),
  KEY idx_sesion_comensal (comensal_id, revocada_en),
  CONSTRAINT fk_sesion_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comensales_codigos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comensal_id INT UNSIGNED NOT NULL,
  -- 'verificar_correo' | 'restablecer_clave'. VARCHAR y no ENUM, como
  -- `llamados_mesero.motivo`: la lista válida la impone el service.
  proposito VARCHAR(30) NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  -- Un código de 6 dígitos solo tiene un millón de valores: lo que lo protege es
  -- el tope de intentos, no su longitud.
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  -- De dónde se pidió. Sirve para investigar abusos, no para decidir nada.
  ip VARCHAR(45) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_codigo_comensal (comensal_id, proposito, creado_en),
  CONSTRAINT fk_codigo_comensal FOREIGN KEY (comensal_id) REFERENCES comensales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Constancia en el registro de migraciones, si la base ya lo tiene (lo crea el
-- saneo del esquema). Sin registro no se hace nada: esta migración no depende
-- de él, y así funciona en cualquier orden.
SET @hay_registro := (
  SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'migraciones_aplicadas'
);
SET @sql := IF(@hay_registro = 1,
  "INSERT IGNORE INTO migraciones_aplicadas (archivo, notas) VALUES ('2026-09-29_comensales.sql', 'App móvil, fase 1: cuentas de comensal, sesiones y códigos')",
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
