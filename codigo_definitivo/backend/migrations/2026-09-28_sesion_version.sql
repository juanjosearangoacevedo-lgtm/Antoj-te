-- ============================================================
-- Revocación de sesiones: versión de sesión por usuario
-- ============================================================
-- El JWT dura 8 horas y hasta ahora no había forma de invalidarlo: un empleado
-- despedido, o alguien a quien le robaron la clave y la cambió, seguía dentro
-- hasta que el token caducara.
--
-- Cada token lleva la versión vigente del usuario en el momento de emitirlo
-- (`sv`). Cambiar o restablecer la contraseña, o cambiar el rol, sube la
-- versión; el middleware rechaza los tokens con una versión vieja. Borrar al
-- usuario también los corta, porque ya no hay fila con la que comparar.
--
-- Nace en 0: los tokens emitidos antes de esta migración no llevan `sv` y se
-- tratan como versión 0, así que el despliegue no cierra la sesión de nadie.
--
-- Idempotente: se puede volver a correr.

SET @db := DATABASE();
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='usuarios' AND COLUMN_NAME='sesion_version');
SET @sql := IF(@existe=0,
  'ALTER TABLE usuarios ADD COLUMN sesion_version INT NOT NULL DEFAULT 0',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
