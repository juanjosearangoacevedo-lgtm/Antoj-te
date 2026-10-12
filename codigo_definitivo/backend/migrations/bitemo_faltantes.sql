-- ============================================================================
--  BITEMO — Completar base de datos existente
--  Para bases que YA tienen las tablas originales de la demo:
--  (carritos, categorias, combos, mesas, planes, platos, restaurantes,
--   roles, sucursales, usuarios, ingredientes, modificadores...)
--
--  Este script:
--   1. Agrega columnas nuevas a tablas existentes (solo si faltan)
--   2. Crea las 12 tablas que faltan
--   3. Siembra roles, planes con features, superadmin y restaurante demo
--  Es idempotente: puede ejecutarse varias veces sin error ni duplicados.
--
--  Ejecutar en Workbench (abrir y ejecutar todo) o:
--    mysql -u root -p < migrations/bitemo_faltantes.sql
--
--  Credenciales que quedan creadas:
--    Superadmin        : admin@bitemo.com / (definida al sembrar, no se publica)
--    Admin restaurante : demo@bitemo.com  / Demo2026*
--    Menú comensal     : http://localhost:5173/?mesa=bitemo-demo
-- ============================================================================

USE menu_digital_saas;

-- ============================================================
-- 1. COLUMNAS NUEVAS EN TABLAS EXISTENTES (solo si no existen)
-- ============================================================
DROP PROCEDURE IF EXISTS bitemo_add_col;
DELIMITER $$
CREATE PROCEDURE bitemo_add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN defn VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', defn);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$
DELIMITER ;

CALL bitemo_add_col('categorias', 'orden', 'INT NOT NULL DEFAULT 0');
CALL bitemo_add_col('platos', 'orden', 'INT NOT NULL DEFAULT 0');
CALL bitemo_add_col('platos', 'imagen_url', 'VARCHAR(500) NULL');
CALL bitemo_add_col('restaurantes', 'estado', "VARCHAR(20) NOT NULL DEFAULT 'activo'");

DROP PROCEDURE bitemo_add_col;

-- estado del restaurante como texto flexible: pendiente | activo | suspendido
ALTER TABLE restaurantes MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'activo';

-- ============================================================
-- 2. TABLAS FALTANTES
-- ============================================================

-- Feature flags por plan
CREATE TABLE IF NOT EXISTS plan_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT UNSIGNED NOT NULL,
  feature VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_plan_feature (plan_id, feature),
  CONSTRAINT fk_pf_plan FOREIGN KEY (plan_id) REFERENCES planes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Historial de suscripciones
CREATE TABLE IF NOT EXISTS suscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT UNSIGNED NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  estado ENUM('activa','cancelada','vencida') NOT NULL DEFAULT 'activa',
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_susc_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_susc_plan FOREIGN KEY (plan_id) REFERENCES planes (id)
) ENGINE=InnoDB;

-- Detalle del carrito (sin FK a carritos para no depender del tipo exacto
-- de su columna id en la tabla ya existente; se indexa igual)
CREATE TABLE IF NOT EXISTS carrito_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrito_id CHAR(36) NOT NULL,
  plato_id INT UNSIGNED NULL,
  combo_id INT UNSIGNED NULL,
  cantidad INT NOT NULL DEFAULT 1,
  notas_instrucciones VARCHAR(500) NULL,
  KEY idx_cd_carrito (carrito_id),
  CONSTRAINT fk_cd_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_cd_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carrito_detalle_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrito_detalle_id INT NOT NULL,
  opcion_modificador_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_cdm_det FOREIGN KEY (carrito_detalle_id) REFERENCES carrito_detalle (id) ON DELETE CASCADE,
  CONSTRAINT fk_cdm_op FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pedidos con precios congelados
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT UNSIGNED NOT NULL,
  sesion_token VARCHAR(80) NOT NULL,
  estado ENUM('Recibido','En Preparación','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Recibido',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ped_sesion (sesion_token),
  CONSTRAINT fk_ped_mesa FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalles_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  plato_id INT UNSIGNED NULL,
  combo_id INT UNSIGNED NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_dp_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE SET NULL,
  CONSTRAINT fk_dp_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_detalle_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id INT NOT NULL,
  opcion_modificador_id INT UNSIGNED NOT NULL,
  precio_cobrado DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_pdm_det FOREIGN KEY (detalle_pedido_id) REFERENCES detalles_pedido (id) ON DELETE CASCADE,
  CONSTRAINT fk_pdm_op FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Trazabilidad de estados (para medir tiempos de cocina)
CREATE TABLE IF NOT EXISTS pedido_tiempos_estados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  estado_cambiado ENUM('Recibido','En Preparación','Listo','Entregado','Cancelado') NOT NULL,
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pte_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Favoritos (likes anónimos del comensal, sobre plato o combo)
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesion_token VARCHAR(80) NOT NULL,
  plato_id INT UNSIGNED NULL,
  combo_id INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fav_sesion (sesion_token),
  CONSTRAINT fk_fav_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recomendaciones cruzadas entre platos (motor IA)
CREATE TABLE IF NOT EXISTS recomendaciones_ia_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plato_id_origen INT UNSIGNED NOT NULL,
  producto_id_recomendado INT UNSIGNED NOT NULL,
  puntaje_afinidad DECIMAL(4,3) NOT NULL DEFAULT 0.5,
  UNIQUE KEY uq_reco (plato_id_origen, producto_id_recomendado),
  CONSTRAINT fk_reco_plato FOREIGN KEY (plato_id_origen) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_reco_reco FOREIGN KEY (producto_id_recomendado) REFERENCES platos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Analítica del embudo de conversión de video
CREATE TABLE IF NOT EXISTS analiticas_eventos_video (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sucursal_id INT UNSIGNED NOT NULL,
  plato_id INT UNSIGNED NULL,
  combo_id INT UNSIGNED NULL,
  tipo_evento VARCHAR(40) NOT NULL,
  tiempo_segundos INT NULL,
  sesion_token VARCHAR(80) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_evento_plato (plato_id, tipo_evento),
  CONSTRAINT fk_ev_suc FOREIGN KEY (sucursal_id) REFERENCES sucursales (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Personalización visual por restaurante (Plan Intermedio+)
CREATE TABLE IF NOT EXISTS temas_restaurante (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT UNSIGNED NOT NULL UNIQUE,
  color_primario VARCHAR(9) NULL,
  color_fondo VARCHAR(9) NULL,
  color_botones VARCHAR(9) NULL,
  color_texto VARCHAR(9) NULL,
  tipografia_titulos VARCHAR(80) NULL,
  tipografia_cuerpo VARCHAR(80) NULL,
  colores_categorias JSON NULL,
  iconografia VARCHAR(40) NULL,
  banner_url VARCHAR(500) NULL,
  portada_url VARCHAR(500) NULL,
  videos_destacados JSON NULL,
  orden_visual JSON NULL,
  estilo_tarjetas VARCHAR(30) NULL,
  config_navegacion JSON NULL,
  modo ENUM('oscuro','claro') NOT NULL DEFAULT 'oscuro',
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tema_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. DATOS INICIALES (guardados por nombre/email: no duplican)
-- ============================================================

-- Roles (por si seed:roles no se ha corrido)
INSERT INTO roles (nombre_rol)
  SELECT 'superadmin' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre_rol = 'superadmin');
INSERT INTO roles (nombre_rol)
  SELECT 'admin_restaurante' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre_rol = 'admin_restaurante');
INSERT INTO roles (nombre_rol)
  SELECT 'cocinero' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre_rol = 'cocinero');
INSERT INTO roles (nombre_rol)
  SELECT 'mesero' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre_rol = 'mesero');

-- Planes comerciales (por nombre). Precios en pesos colombianos (COP).
INSERT INTO planes (nombre, precio, descripcion)
  SELECT 'Básico', 99000, 'Carta digital con fotos y videos: categorías, productos, precios y orden de visualización.'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Básico');
INSERT INTO planes (nombre, precio, descripcion)
  SELECT 'Intermedio', 169900, 'Todo lo del Básico + personalización visual completa del menú.'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Intermedio');
INSERT INTO planes (nombre, precio, descripcion)
  SELECT 'Pro', 229900, 'Todo lo anterior + carrito, envío automático a cocina y panel de cocina en tiempo real.'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Pro');

-- Feature flags (se reconstruyen para estos 3 planes)
DELETE pf FROM plan_features pf JOIN planes p ON p.id = pf.plan_id
  WHERE p.nombre IN ('Básico', 'Intermedio', 'Pro');
INSERT IGNORE INTO plan_features (plan_id, feature)
  SELECT id, 'menu' FROM planes WHERE nombre IN ('Básico', 'Intermedio', 'Pro');
INSERT IGNORE INTO plan_features (plan_id, feature)
  SELECT id, 'personalizacion' FROM planes WHERE nombre IN ('Intermedio', 'Pro');
INSERT IGNORE INTO plan_features (plan_id, feature)
  SELECT id, 'carrito' FROM planes WHERE nombre = 'Pro';
INSERT IGNORE INTO plan_features (plan_id, feature)
  SELECT id, 'kds' FROM planes WHERE nombre = 'Pro';

-- Superadmin (password: (definida al sembrar, no se publica))
INSERT INTO usuarios (nombre, email, password_hash, restaurante_id, role_id)
  SELECT 'Juan Jose', 'admin@bitemo.com',
         '$2a$10$hz8HxbWBZ5l/jHnGtLI3sOyl9L8nOYWV8veI3cUmPu2cnCmT21PA6',
         NULL, (SELECT id FROM roles WHERE nombre_rol = 'superadmin')
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@bitemo.com');

-- ---- Restaurante demo: Casa Bitemo (Plan Pro, activo) ----
INSERT INTO restaurantes (id, nombre, plan_id, estado)
  SELECT 100, 'Casa Bitemo', (SELECT id FROM planes WHERE nombre = 'Pro' LIMIT 1), 'activo'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM restaurantes WHERE nombre = 'Casa Bitemo');

INSERT INTO suscripciones (restaurante_id, plan_id)
  SELECT r.id, r.plan_id FROM restaurantes r
  WHERE r.nombre = 'Casa Bitemo'
    AND NOT EXISTS (SELECT 1 FROM suscripciones s WHERE s.restaurante_id = r.id);

-- Admin del restaurante demo (password: Demo2026*)
INSERT INTO usuarios (nombre, email, password_hash, restaurante_id, role_id)
  SELECT 'Demo Bitemo', 'demo@bitemo.com',
         '$2a$10$jEOsnVQ0pH21ZjdaWIR2qukUlzr10c/mKxp0yXX6KAvckCj4KPTRC',
         (SELECT id FROM restaurantes WHERE nombre = 'Casa Bitemo'),
         (SELECT id FROM roles WHERE nombre_rol = 'admin_restaurante')
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'demo@bitemo.com');

-- Sucursal y mesas (QR fijo para probar: ?mesa=bitemo-demo)
INSERT INTO sucursales (id, restaurante_id, nombre, direccion, telefono)
  SELECT 100, (SELECT id FROM restaurantes WHERE nombre = 'Casa Bitemo'), 'Sede Principal', 'Calle 10 # 5-23', '3001234567'
  FROM DUAL WHERE NOT EXISTS (
    SELECT 1 FROM sucursales WHERE restaurante_id = (SELECT id FROM restaurantes WHERE nombre = 'Casa Bitemo')
  );

INSERT IGNORE INTO mesas (id, sucursal_id, numero_mesa, codigo_qr_token) VALUES
  (100, 100, '1', 'bitemo-demo'),
  (101, 100, '2', 'bitemo-demo-mesa-2');

-- Categorías (4)
INSERT IGNORE INTO categorias (id, restaurante_id, nombre, orden) VALUES
  (100, 100, 'Entradas', 0),
  (101, 100, 'Platos Fuertes', 1),
  (102, 100, 'Postres', 2),
  (103, 100, 'Bebidas', 3);

-- Platos: 3 videos por categoría (videos de muestra, reemplazar desde el panel)
INSERT IGNORE INTO platos (id, categoria_id, nombre, descripcion, precio, video_url, orden, nivel_picante, recomendado_chef) VALUES
  (100, 100, 'Carpaccio de Res', 'Láminas finas de res, rúgula fresca, parmesano y aceite de oliva al limón.', 24000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 0, 0, 1),
  (101, 100, 'Croquetas de Jamón', 'Croquetas cremosas doradas al momento con alioli suave de ajo asado.', 18000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 1, 0, 0),
  (102, 100, 'Ceviche de la Casa', 'Pesca del día marinada en leche de tigre, camote crocante y maíz cancha.', 28000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 2, 1, 0),
  (103, 101, 'Ribeye a la Brasa', '350 g de ribeye madurado, papas rústicas confitadas y chimichurri de la casa.', 62000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 0, 0, 1),
  (104, 101, 'Risotto de Hongos', 'Arroz arborio cremoso, mezcla de hongos silvestres y aceite de trufa.', 42000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 1, 0, 0),
  (105, 101, 'Pollo al Curry Rojo', 'Pollo en curry rojo tailandés con leche de coco, arroz jazmín y cilantro.', 38000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 2, 0),
  (106, 102, 'Cheesecake de Frutos Rojos', 'Base de galleta artesanal, queso crema horneado y coulis de frutos rojos.', 18000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 0, 0, 1),
  (107, 102, 'Brownie con Helado', 'Brownie de chocolate 70% tibio, helado de vainilla y nueces caramelizadas.', 16000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 1, 0, 0),
  (108, 102, 'Affogato Clásico', 'Helado de vainilla ahogado en espresso recién extraído y cacao amargo.', 14000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 0, 0),
  (109, 103, 'Limonada de Hierbabuena', 'Limones exprimidos al momento con hierbabuena y jarabe natural.', 9000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 0, 0, 0),
  (110, 103, 'Sangría de la Casa', 'Vino tinto, frutas maceradas y un toque de brandy. Jarra para compartir.', 32000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 1, 0, 1),
  (111, 103, 'Cold Brew Tonic', 'Café de origen extraído en frío sobre tónica y cáscara de naranja.', 13000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 0, 0);

-- Modificadores de ejemplo (grupo "Adiciones" aplicado al Cheesecake)
INSERT IGNORE INTO grupos_modificadores (id, restaurante_id, nombre, min_seleccion, max_seleccion, es_obligatorio) VALUES
  (100, 100, 'Adiciones', 0, 2, 0);
INSERT IGNORE INTO opciones_modificadores (id, grupo_id, nombre, precio_adicional) VALUES
  (100, 100, 'Extra frutos rojos', 3000),
  (101, 100, 'Chantilly', 2000);
INSERT IGNORE INTO plato_grupos_modificadores (plato_id, grupo_id)
  SELECT 106, 100 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM plato_grupos_modificadores WHERE plato_id = 106 AND grupo_id = 100)
    AND EXISTS (SELECT 1 FROM platos WHERE id = 106);

-- Recomendaciones cruzadas
INSERT IGNORE INTO recomendaciones_ia_productos (plato_id_origen, producto_id_recomendado, puntaje_afinidad) VALUES
  (103, 110, 0.9),
  (106, 108, 0.8),
  (100, 103, 0.7);

-- Tema visual del restaurante demo
-- Sin colores ni tipografias: en NULL el menu hereda el diseno de Bitemo.
INSERT IGNORE INTO temas_restaurante
  (restaurante_id, colores_categorias, modo)
SELECT id,
       '{"Entradas":"#6e8f5c","Platos Fuertes":"#e7a93c","Postres":"#d8482f","Bebidas":"#5cb8e4"}',
       'oscuro'
FROM restaurantes WHERE nombre = 'Casa Bitemo';

-- ============================================================
SELECT 'Base de datos completada.' AS resultado,
       (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) AS tablas_totales,
       (SELECT COUNT(*) FROM planes) AS planes,
       (SELECT COUNT(*) FROM plan_features) AS features,
       (SELECT COUNT(*) FROM platos) AS platos;
