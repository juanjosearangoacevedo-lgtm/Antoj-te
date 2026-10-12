-- ============================================================================
-- Llamar al mesero desde la mesa, y personalización de la pantalla de bienvenida
--
-- Dos cosas que van juntas porque nacen de la misma pantalla: la que ve el
-- comensal ANTES de elegir categoría. Ahí aparecen el botón de llamado y los
-- enlaces a las redes del restaurante, y ambos se encienden desde
-- Personalización.
--
-- La collation va explícita: la base ya se partió una vez en dos collations
-- (ver 2026-07-31_unificar_collation.sql) y un JOIN entre tablas con
-- collations distintas revienta.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Los llamados
--
-- Un llamado es una petición de atención hecha desde una mesa, no un pedido:
-- por eso NO cuelga de `pedidos` (un comensal puede llamar sin haber ordenado,
-- que es justamente el caso de "quiero preguntar algo de la carta").
--
-- POR QUÉ ESTA TABLA SE CREA CON SQL DINÁMICO
-- Las claves ajenas exigen que la columna que apunta tenga EXACTAMENTE el mismo
-- tipo que la apuntada, y ahí las bases de Bitemo no coinciden entre sí:
-- `bitemo_completo.sql` declara `mesas.id` y `usuarios.id` como INT, mientras
-- que la base de desarrollo —que nació del volcado de la demo— los tiene en
-- INT UNSIGNED (el mismo desfase que ya obligó a corregir bitemo_faltantes.sql).
-- Un tipo fijo aquí funcionaría en un entorno y reventaría en el otro con
-- "Referencing column ... are incompatible". Leer el tipo real de la base y
-- construir el CREATE con él es lo único que funciona en las dos.
-- ---------------------------------------------------------------------------

SET @tipo_mesa := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mesas' AND COLUMN_NAME = 'id'
);
SET @tipo_usuario := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id'
);

SET @crear_llamados := CONCAT(
  'CREATE TABLE IF NOT EXISTS llamados_mesero (
     id INT AUTO_INCREMENT PRIMARY KEY,
     mesa_id ', @tipo_mesa, ' NOT NULL,

     -- La sesión anónima del comensal. Admite NULL porque el llamado vale igual
     -- sin ella: lo que el mesero necesita saber es la mesa, no quién tocó.
     sesion_token VARCHAR(80) NULL,

     -- Para qué llaman. VARCHAR y no ENUM para poder sumar motivos nuevos sin un
     -- ALTER: la lista válida la impone el validador (llamados.service.js).
     motivo VARCHAR(30) NOT NULL DEFAULT ''mesero'',

     estado ENUM(''pendiente'', ''atendido'') NOT NULL DEFAULT ''pendiente'',

     creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     atendido_en DATETIME NULL,
     atendido_por ', @tipo_usuario, ' NULL,

     -- UN SOLO LLAMADO PENDIENTE POR MESA, GARANTIZADO POR LA BASE.
     --
     -- Sin esto, un comensal impaciente tocando cinco veces llena la pantalla de
     -- cocina de tarjetas repetidas de la misma mesa. Comprobarlo en el service
     -- con un SELECT previo dejaría abierta la carrera entre dos toques casi
     -- simultáneos; esta columna generada la cierra: vale `mesa_id` mientras el
     -- llamado está pendiente y NULL cuando se atiende, y en un índice UNIQUE
     -- los NULL no chocan entre sí. Así una mesa acumula todo su historial de
     -- llamados atendidos, pero nunca dos pendientes a la vez.
     --
     -- VIRTUAL y no STORED, y no es un detalle de gusto: MySQL prohíbe que una
     -- clave ajena sobre la columna BASE de una generada STORED use CASCADE o
     -- SET NULL, y `mesa_id` necesita ON DELETE CASCADE. Con VIRTUAL no se
     -- guarda nada (solo vive en el índice) y la restricción no aplica.
     mesa_pendiente ', @tipo_mesa, ' GENERATED ALWAYS AS (IF(estado = ''pendiente'', mesa_id, NULL)) VIRTUAL,

     CONSTRAINT fk_llamado_mesa FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON DELETE CASCADE,
     -- Si se borra el usuario que atendió, el llamado sobrevive sin dueño: el
     -- dato histórico interesa más que saber quién fue.
     CONSTRAINT fk_llamado_usuario FOREIGN KEY (atendido_por) REFERENCES usuarios (id) ON DELETE SET NULL,

     UNIQUE KEY uq_llamado_pendiente (mesa_pendiente),
     -- La consulta del panel de cocina: pendientes, más antiguos primero.
     INDEX idx_estado_creado (estado, creado_en)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);

PREPARE crear_llamados FROM @crear_llamados;
EXECUTE crear_llamados;
DEALLOCATE PREPARE crear_llamados;

-- ---------------------------------------------------------------------------
-- 2. La personalización de la bienvenida
--
-- Misma convención que el resto de `temas_restaurante`: NULL significa "usa el
-- valor por defecto de Bitemo", nunca un valor concreto. Por eso las tres
-- admiten NULL y ninguna trae DEFAULT.
-- ---------------------------------------------------------------------------
ALTER TABLE temas_restaurante
  -- ¿Se muestra el botón de llamar al mesero? NULL = no. Hay que encenderlo a
  -- propósito: si nadie mira el panel, un botón que no responde es peor que no
  -- tenerlo.
  ADD COLUMN llamar_mesero TINYINT(1) NULL AFTER mostrar_precio_feed,
  -- Saludo de la pantalla de bienvenida. NULL = "¡Bienvenido a <restaurante>!".
  ADD COLUMN mensaje_bienvenida VARCHAR(200) NULL AFTER llamar_mesero,
  -- Enlaces a redes: [{ "red": "instagram", "url": "https://..." }, …].
  -- JSON y no columnas sueltas porque la lista de redes cambia con el tiempo y
  -- no queremos un ALTER por cada una. El esquema lo valida temas.validator.js,
  -- que solo acepta enlaces http(s): estos van a un href del menú público.
  ADD COLUMN redes_sociales JSON NULL AFTER mensaje_bienvenida;
