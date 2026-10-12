-- ============================================================
-- Slug del restaurante: su dirección pública en internet
-- ============================================================
-- Hasta ahora al menú SOLO se llegaba escaneando el QR de una mesa
-- (/menu?mesa=<token>). Ese token es opaco, cambia si se regenera el QR y no
-- sirve para poner en Instagram ni para que lo indexe nadie.
--
-- El slug le da a cada restaurante una URL estable y legible —/r/la-pasta— que
-- funciona sin mesa, se puede compartir y es la única que tiene sentido indexar.
--
-- Se añade también `descripcion`: sin una frase propia, la meta description de
-- todos los restaurantes sería idéntica, y eso es contenido duplicado — que es
-- exactamente lo que hunde a un sitio con muchas páginas parecidas.
--
-- Idempotente: se puede volver a correr.

SET @db := DATABASE();

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='restaurantes' AND COLUMN_NAME='slug');
SET @sql := IF(@existe=0,
  'ALTER TABLE restaurantes ADD COLUMN slug VARCHAR(120) NULL AFTER nombre', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='restaurantes' AND COLUMN_NAME='descripcion');
SET @sql := IF(@existe=0,
  'ALTER TABLE restaurantes ADD COLUMN descripcion VARCHAR(300) NULL AFTER slug', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Ciudad: la usa el título y el JSON-LD ("Menú de X en Medellín"). Las búsquedas
-- que puede ganar un restaurante son locales — "restaurante X Medellín" —, y sin
-- ciudad la página no compite por ninguna.
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='restaurantes' AND COLUMN_NAME='ciudad');
SET @sql := IF(@existe=0,
  'ALTER TABLE restaurantes ADD COLUMN ciudad VARCHAR(100) NULL AFTER descripcion', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Relleno inicial: minúsculas, sin tildes, sin signos, con guiones.
-- Se hace en SQL y no en JavaScript porque tiene que valer también para las filas
-- que ya existen, y a esas no las va a tocar ningún formulario.
UPDATE restaurantes
   SET slug = TRIM(BOTH '-' FROM
         REGEXP_REPLACE(
           LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
             nombre,
             'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),'ü','u'),'ñ','n')),
           '[^a-z0-9]+', '-'))
 WHERE slug IS NULL OR slug = '';

-- Red de seguridad: un nombre que se quede en blanco tras limpiarlo (por ejemplo
-- uno escrito solo con signos) no puede quedarse sin dirección.
UPDATE restaurantes SET slug = CONCAT('restaurante-', id) WHERE slug IS NULL OR slug = '';

-- Desempate: dos restaurantes que se llamen igual producen el mismo slug, y el
-- índice único de abajo fallaría. Al repetido se le pega su id.
UPDATE restaurantes r
  JOIN (SELECT slug FROM restaurantes GROUP BY slug HAVING COUNT(*) > 1) d
    ON d.slug = r.slug
   SET r.slug = CONCAT(r.slug, '-', r.id);

-- El índice va DESPUÉS del relleno: antes habría chocado con los duplicados.
SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='restaurantes' AND INDEX_NAME='uq_restaurante_slug');
SET @sql := IF(@existe=0,
  'ALTER TABLE restaurantes ADD UNIQUE KEY uq_restaurante_slug (slug)', 'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
