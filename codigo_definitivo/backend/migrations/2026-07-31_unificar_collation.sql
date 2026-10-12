-- ============================================================================
-- Unifica la collation de toda la base a utf8mb4_unicode_ci
--
-- PROBLEMA QUE CORRIGE
-- La base quedó partida en dos collations: las 16 tablas originales usan
-- utf8mb4_0900_ai_ci (el default de MySQL 8) y las 12 creadas después por
-- `bitemo_faltantes.sql` usan utf8mb4_unicode_ci (el que declara
-- `bitemo_completo.sql`). MySQL no puede comparar dos columnas de texto con
-- collations distintas, así que CUALQUIER JOIN entre una tabla vieja y una
-- nueva revienta con:
--
--   Illegal mix of collations (utf8mb4_0900_ai_ci,IMPLICIT)
--   and (utf8mb4_unicode_ci,IMPLICIT) for operation '='
--
-- SÍNTOMA VISIBLE EN LA APP
-- El comensal no puede cambiar la cantidad ni eliminar una línea de su
-- carrito: PUT y DELETE /api/public/carrito/detalle/:id responden 500. El
-- middleware `requireFeatureDetallePublic` une carrito_detalle.carrito_id
-- (nueva) con carritos.id (vieja), y ahí falla.
--
-- DIRECCIÓN DEL ARREGLO
-- Se convierten las 16 tablas viejas a utf8mb4_unicode_ci, que es lo que ya
-- declara la base por defecto y lo que produce una instalación limpia con
-- `bitemo_completo.sql`. Así la base local queda igual que una nueva.
--
-- ANTES DE EJECUTAR: haz un respaldo (backup.sh o mysqldump).
-- ============================================================================

-- Las FK se desactivan durante la conversión: al cambiar la collation de una
-- columna referenciada, MySQL rechazaría temporalmente la FK que la apunta.
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE carritos                    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE categorias                  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE combo_items                 CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE combos                      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE grupos_modificadores        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ingredientes                CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE mesas                       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE opciones_modificadores      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE planes                      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE plato_grupos_modificadores  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE plato_ingredientes          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE platos                      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE restaurantes                CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE roles                       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sucursales                  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE usuarios                    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificación: debe devolver 0 filas.
-- SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_COLLATION <> 'utf8mb4_unicode_ci';
