-- ============================================================================
-- Los planes pasan a cobrarse en pesos colombianos.
--
-- QUÉ CAMBIA
-- La tabla `planes` guardaba 29 / 59 / 99: cifras pensadas en dólares, de
-- cuando el precio todavía no estaba decidido. Antojate vende en Colombia y
-- factura en pesos, así que el panel mostraba "$29/mes" —un número que no
-- corresponde a nada que se le pueda cobrar a un restaurante.
--
--   Básico       29  ->  99.000
--   Intermedio   59  -> 169.900
--   Pro          99  -> 229.900
--
-- La columna es DECIMAL(10,2), así que 229900.00 entra de sobra: no hay que
-- tocar el esquema.
--
-- QUÉ NO CAMBIA
-- Los precios de los PLATOS. Esos los fija cada restaurante en la moneda que
-- eligió (restaurantes.moneda) y no tienen relación con lo que paga por Antojate.
--
-- POR QUÉ EL LIKE 'B_sico' EN LUGAR DE = 'Básico'
-- El cliente `mysql` de la imagen arranca en latin1. Si alguien corre este
-- archivo sin --default-character-set=utf8mb4, la 'á' viaja mal codificada, la
-- comparación no encuentra la fila y el UPDATE afecta 0 registros SIN dar
-- ningún error: el plan se quedaría en 29 y nadie se enteraría. El `_` de LIKE
-- casa con cualquier carácter y evita el problema de raíz.
--
-- Es idempotente: correrlo dos veces deja exactamente lo mismo.
-- ============================================================================

UPDATE planes SET precio = 99000  WHERE nombre LIKE 'B_sico';
UPDATE planes SET precio = 169900 WHERE nombre = 'Intermedio';
UPDATE planes SET precio = 229900 WHERE nombre = 'Pro';

-- Verificación: las tres filas deben salir con el precio nuevo.
SELECT id, nombre, precio FROM planes ORDER BY precio;
