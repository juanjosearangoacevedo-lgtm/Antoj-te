-- ============================================================
-- Pagos de la suscripción por Wompi
-- ============================================================
-- Cada intento de pago del restaurante es una fila. Nace 'pendiente' cuando el
-- admin pulsa "Pagar" y la cierra Wompi: por el webhook o, si el webhook no ha
-- llegado todavía, cuando el navegador vuelve del checkout y el backend le
-- pregunta a Wompi por la transacción. Solo un pago 'aprobado' extiende la
-- suscripción, y solo una vez (`aplicado_en`).
--
-- SIN claves ajenas, a propósito, igual que `solicitudes_demo`:
--   - es un registro contable: si un restaurante se borra, sus pagos tienen que
--     sobrevivir para poder cuadrar con Wompi, no desaparecer en cascada;
--   - y esquiva el desfase INT / INT UNSIGNED entre la base local y producción.
--
-- Montos en CENTAVOS, que es como los maneja Wompi: comparar el monto que
-- confirma Wompi contra el que se pidió es una igualdad de enteros, sin decimales.
--
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  plan_id INT NOT NULL,
  periodo ENUM('mensual', 'anual') NOT NULL,
  monto_centavos BIGINT NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  -- La que viaja a Wompi y vuelve en el webhook. Es la llave para casar los dos lados.
  referencia VARCHAR(64) NOT NULL,
  estado ENUM('pendiente', 'aprobado', 'rechazado', 'anulado', 'error') NOT NULL DEFAULT 'pendiente',
  wompi_transaccion_id VARCHAR(64) NULL,
  metodo VARCHAR(40) NULL,
  -- Cuándo se sumó el periodo a la suscripción. NULL = todavía no. Es lo que
  -- impide que un webhook repetido regale dos meses.
  aplicado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pago_referencia (referencia),
  KEY idx_pago_restaurante (restaurante_id, creado_en)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
