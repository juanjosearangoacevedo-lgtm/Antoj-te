-- ============================================================================
-- Saneo del esquema (Fase 1 del plan de Visual Commerce)
--
-- Tres arreglos que NO añaden ninguna funcionalidad: dejan la base en
-- condiciones de recibir las tablas nuevas del feed, la capa social y las
-- reservas. Se hacen ahora y no después porque los tres empeoran con el tiempo:
-- uno es un bug vivo en producción, otro es un registro que solo sirve si se
-- empieza a llevar, y el tercero es un índice que cuesta más cuanto más datos
-- haya que limpiar antes.
--
--   1. `migraciones_aplicadas`  — dejar por escrito qué se aplicó y cuándo.
--   2. `ingredientes`           — la tabla y el código no coinciden, y en
--                                 producción eso es un 500 al crear ingredientes.
--   3. `favoritos`              — no tiene índice único, así que admite
--                                 duplicados por carrera.
--
-- IDEMPOTENTE: cada paso consulta information_schema antes de tocar nada, así
-- que este archivo se puede volver a ejecutar sin que reviente. Es obligatorio
-- porque en producción las migraciones se aplican a mano, y a mano se repiten.
--
-- Aplicar SIEMPRE con --default-character-set=utf8mb4 (ver init-db.sh).
--
-- RETOMADO EL 2026-10-12 (decisión D2 de APP_MOVIL.md). Se escribió el 15 de
-- septiembre sobre 995b4e3 y quedó sin commitear en otra copia de trabajo; aquí
-- vuelve sobre 92332b9, con un añadido: también registra las migraciones del 28
-- y 29 de septiembre, cada una por su propia huella. Por eso va AL FINAL de
-- init-db.sh aunque su fecha sea anterior: registra lo que tiene encima.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. REGISTRO DE MIGRACIONES
--
-- Hasta hoy no había ninguna forma de saber, mirando una base, qué migraciones
-- tenía encima: init-db.sh solo corre la primera vez que arranca el contenedor,
-- y en producción cada archivo se pasa a mano. El estado real solo existía en
-- la cabeza de quien lo aplicó, y eso ya no escala con dos entornos que llevan
-- meses divergiendo.
--
-- La tabla es deliberadamente tonta: el nombre del archivo es la clave, así que
-- registrar dos veces la misma migración no hace nada.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
  archivo VARCHAR(160) NOT NULL PRIMARY KEY,
  aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notas VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro en retrospectiva de lo que ya estaba aplicado.
--
-- No se puede saber con certeza qué corrió en una base que no llevaba registro,
-- así que se infiere de UNA señal fiable: `restaurantes.slug` lo crea la última
-- migración de la serie (2026-08-11). Si esa columna existe, todas las
-- anteriores se aplicaron; si no existe, no se adivina nada y la tabla arranca
-- vacía. La inferencia es conservadora a propósito: es peor un registro que
-- miente que uno incompleto.
--
-- Y solo se hace si la tabla está vacía, para no reescribir un historial real.

SET @tiene_slug := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurantes' AND COLUMN_NAME = 'slug'
);
SET @registro_vacio := (SELECT COUNT(*) = 0 FROM migraciones_aplicadas);

INSERT IGNORE INTO migraciones_aplicadas (archivo, notas)
SELECT archivo, 'registrada en retrospectiva por 2026-09-15_saneo_esquema.sql'
  FROM (
              SELECT 'bitemo_completo.sql'                        AS archivo
    UNION ALL SELECT '2026-07-21_platos_video_bunny.sql'
    UNION ALL SELECT '2026-07-22_platos_recomendado_horario.sql'
    UNION ALL SELECT '2026-07-22_restaurantes_moneda.sql'
    UNION ALL SELECT '2026-07-22_tema_layout_categorias.sql'
    UNION ALL SELECT '2026-07-31_tema_personalizacion_avanzada.sql'
    UNION ALL SELECT '2026-08-02_solicitudes_demo.sql'
    UNION ALL SELECT '2026-08-03_demo_videos_bunny.sql'
    UNION ALL SELECT '2026-08-04_llamados_mesero_y_bienvenida.sql'
    UNION ALL SELECT '2026-08-06_planes_precios_cop.sql'
    UNION ALL SELECT '2026-08-10_analitica_indices.sql'
    UNION ALL SELECT '2026-08-10_planes_comerciales.sql'
    UNION ALL SELECT '2026-08-10_solicitudes_cuenta.sql'
    UNION ALL SELECT '2026-08-11_restaurantes_slug.sql'
  ) AS historico
 WHERE @tiene_slug = 1 AND @registro_vacio = 1;

-- Las de septiembre no se deducen de la serie: cada una deja una huella propia
-- (una tabla o una columna que solo ella crea) y se registra si esa huella está.
-- Aquí no hace falta que el registro esté vacío: la huella es exacta, así que
-- anotarla completa el historial en vez de reescribirlo. Las que vengan después
-- ya se registran solas al final de su archivo.
INSERT IGNORE INTO migraciones_aplicadas (archivo, notas)
SELECT archivo, 'registrada en retrospectiva por 2026-09-15_saneo_esquema.sql'
  FROM (
              SELECT '2026-09-28_pagos_wompi.sql' AS archivo,
                     (SELECT COUNT(*) FROM information_schema.TABLES
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos') AS huella
    UNION ALL SELECT '2026-09-28_recuperacion_password.sql',
                     (SELECT COUNT(*) FROM information_schema.TABLES
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets')
    UNION ALL SELECT '2026-09-28_actualizado_en.sql',
                     (SELECT COUNT(*) = 2 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'actualizado_en'
                         AND TABLE_NAME IN ('platos', 'restaurantes'))
    UNION ALL SELECT '2026-09-28_sesion_version.sql',
                     (SELECT COUNT(*) FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'sesion_version')
    -- Esta se registra sola si el registro ya existía cuando corrió; si corrió
    -- antes (una base que tuvo la app antes que el saneo), se anota aquí.
    UNION ALL SELECT '2026-09-29_comensales.sql',
                     (SELECT COUNT(*) FROM information_schema.TABLES
                       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comensales')
  ) AS septiembre
 WHERE huella > 0;


-- ---------------------------------------------------------------------------
-- 2. `ingredientes`: LA TABLA Y EL CÓDIGO NO HABLAN DE LO MISMO
--
-- EL BUG. `ingredientes.model.js` escribe y lee `costo_unitario` y
-- `stock_actual`. La base de desarrollo —nacida del volcado de la demo— tiene
-- exactamente esas dos columnas, así que en local todo funciona. Pero
-- `bitemo_completo.sql`, que es el esquema que carga init-db.sh y por tanto el
-- de PRODUCCIÓN, declara `stock` y `unidad`: ahí el mismo INSERT falla con
-- "Unknown column 'costo_unitario' in 'field list'" y el backend responde 500.
--
-- No es teórico ni está escondido detrás de una pantalla que nadie usa: el
-- editor de ingredientes de un plato llama a POST /api/ingredientes en cuanto
-- el admin escribe un ingrediente que no está en el catálogo
-- (EditorIngredientes.jsx:44).
--
-- POR QUÉ SE ARREGLA LA BASE Y NO EL CÓDIGO. Se podría reescribir el model para
-- usar `stock`, pero entonces rompería la base de desarrollo y habría que tocar
-- model, validador y service. Renombrar la columna arregla producción, no toca
-- ni una línea de JavaScript y conserva los datos que ya haya.
--
-- Las dos bases terminan con las MISMAS seis columnas, que es el objetivo real:
-- id, restaurante_id, nombre, costo_unitario, es_alergeno, stock_actual, unidad.
-- ---------------------------------------------------------------------------

SET @col_stock := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'stock'
);
SET @col_stock_actual := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'stock_actual'
);

-- 2a. `stock` -> `stock_actual`. CHANGE y no DROP + ADD: el renombrado conserva
--     las existencias que el restaurante ya tenga cargadas.
SET @sql := IF(@col_stock = 1 AND @col_stock_actual = 0,
  'ALTER TABLE ingredientes CHANGE stock stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2b. Ninguna de las dos existía (base a medio construir): se crea.
SET @col_stock_actual := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'stock_actual'
);
SET @sql := IF(@col_stock_actual = 0,
  'ALTER TABLE ingredientes ADD COLUMN stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2c. `costo_unitario`: existe en desarrollo y falta en producción.
SET @col_costo := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'costo_unitario'
);
SET @sql := IF(@col_costo = 0,
  'ALTER TABLE ingredientes ADD COLUMN costo_unitario DECIMAL(10,4) NOT NULL DEFAULT 0 AFTER nombre',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2d. `unidad`: al revés que la anterior, existe en producción y falta en
--     desarrollo. El código todavía no la expone, pero se iguala igual: dejar
--     una columna en una base y no en la otra es exactamente la enfermedad que
--     este archivo viene a curar.
SET @col_unidad := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'unidad'
);
SET @sql := IF(@col_unidad = 0,
  'ALTER TABLE ingredientes ADD COLUMN unidad VARCHAR(20) NULL',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 2e. `nombre` mide 150 en desarrollo y 120 en producción, mientras el
--     validador aceptaba hasta 255. Un ingrediente de 130 caracteres se guarda
--     en local y revienta en producción con "Data too long". Se ensancha al
--     mayor de los dos (ensanchar nunca pierde datos) y el validador baja a 150
--     para que el corte lo haga Zod con un 400 legible, no MySQL con un 500.
SET @ancho_nombre := (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingredientes' AND COLUMN_NAME = 'nombre'
);
SET @sql := IF(@ancho_nombre < 150,
  'ALTER TABLE ingredientes MODIFY nombre VARCHAR(150) NOT NULL',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;


-- ---------------------------------------------------------------------------
-- 3. `favoritos`: UN ÍNDICE ÚNICO DONDE HOY SOLO HAY BUENA VOLUNTAD
--
-- El toggle de favoritos consulta si la fila existe y después inserta o borra
-- (favoritos.service.js). Entre esas dos consultas cabe otra petición: dos
-- toques rápidos —o un doble toque del propio comensal— dejan dos filas para el
-- mismo plato y la misma sesión, y a partir de ahí el toggle alterna entre
-- borrar una y crear otra sin volver nunca al estado limpio.
--
-- Hoy eso solo ensucia. Cuando el feed muestre "1.2k me gusta" contando filas,
-- pasa a ser un contador que miente.
--
-- POR QUÉ COLUMNAS GENERADAS Y NO UN ÍNDICE DIRECTO. En MySQL un UNIQUE que
-- incluya columnas NULL NO impide duplicados: dos NULL nunca son "iguales", así
-- que UNIQUE (sesion_token, plato_id, combo_id) dejaría pasar todos los
-- favoritos de plato (que tienen combo_id NULL) y no serviría de nada. Las dos
-- columnas generadas convierten el NULL en 0, que sí compara.
--
-- VIRTUAL y no STORED: MySQL prohíbe que una clave ajena sobre la columna base
-- de una generada STORED use CASCADE o SET NULL, y `plato_id` y `combo_id`
-- tienen las dos su FK con ON DELETE CASCADE. Con VIRTUAL no hay conflicto y el
-- índice funciona igual.
-- ---------------------------------------------------------------------------

-- 3a. Limpiar lo que ya hubiera, o el ALTER de más abajo fallaría con
--     "Duplicate entry". Se conserva el favorito más antiguo de cada grupo.
DELETE f FROM favoritos f
  JOIN (
    SELECT MIN(id) AS conservar,
           sesion_token,
           COALESCE(plato_id, 0) AS p,
           COALESCE(combo_id, 0) AS c
      FROM favoritos
     GROUP BY sesion_token, p, c
    HAVING COUNT(*) > 1
  ) AS duplicados
    ON duplicados.sesion_token = f.sesion_token
   AND duplicados.p = COALESCE(f.plato_id, 0)
   AND duplicados.c = COALESCE(f.combo_id, 0)
 WHERE f.id > duplicados.conservar;

-- 3b. Las columnas generadas, con el tipo REAL de la columna base: `plato_id`
--     es INT en una base e INT UNSIGNED en la otra, y una generada declarada
--     con el tipo equivocado cambia el valor en silencio.
SET @tipo_plato := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoritos' AND COLUMN_NAME = 'plato_id'
);
SET @tipo_combo := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoritos' AND COLUMN_NAME = 'combo_id'
);

SET @col_plato_k := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoritos' AND COLUMN_NAME = 'plato_k'
);
SET @sql := IF(@col_plato_k = 0,
  CONCAT('ALTER TABLE favoritos ADD COLUMN plato_k ', @tipo_plato,
         ' GENERATED ALWAYS AS (COALESCE(plato_id, 0)) VIRTUAL'),
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

SET @col_combo_k := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoritos' AND COLUMN_NAME = 'combo_k'
);
SET @sql := IF(@col_combo_k = 0,
  CONCAT('ALTER TABLE favoritos ADD COLUMN combo_k ', @tipo_combo,
         ' GENERATED ALWAYS AS (COALESCE(combo_id, 0)) VIRTUAL'),
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- 3c. El índice único. A partir de aquí el duplicado es imposible en la base,
--     no solo improbable en el service.
SET @idx_fav := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoritos' AND INDEX_NAME = 'uq_fav_sesion'
);
SET @sql := IF(@idx_fav = 0,
  'ALTER TABLE favoritos ADD UNIQUE KEY uq_fav_sesion (sesion_token, plato_k, combo_k)',
  'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;


-- ---------------------------------------------------------------------------
-- 4. Dejar constancia de esta misma migración.
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO migraciones_aplicadas (archivo, notas)
VALUES ('2026-09-15_saneo_esquema.sql', 'Fase 1: registro de migraciones, ingredientes y unicidad de favoritos');
