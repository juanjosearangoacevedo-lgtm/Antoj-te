-- ============================================================
-- Recuperar contraseña: enlaces de un solo uso
-- ============================================================
-- Cada "olvidé mi contraseña" crea una fila. El enlace que llega por correo
-- lleva un token aleatorio; aquí se guarda SOLO su SHA-256. Quien lea esta
-- tabla (un volcado, un respaldo filtrado) no puede usar ningún enlace.
--
-- El enlace caduca (expira_en) y sirve una vez (usado_en). Al restablecer, se
-- anulan también los demás enlaces vivos del mismo usuario.
--
-- SIN clave ajena a `usuarios`, como `pagos` y `solicitudes_demo`: esquiva el
-- desfase INT / INT UNSIGNED entre la base local y producción. Si un usuario se
-- borra, sus enlaces quedan huérfanos y ya no sirven (el service busca al
-- usuario antes de tocar nada).
--
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  -- De dónde se pidió. Sirve para investigar abusos, no para decidir nada.
  ip VARCHAR(45) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_token (token_hash),
  KEY idx_reset_usuario (usuario_id, creado_en)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
