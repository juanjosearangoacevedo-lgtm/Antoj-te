-- ============================================================================
--  ANTOJATE — Base de datos completa (esquema + datos iniciales)
--  Idempotente: puede ejecutarse varias veces sin duplicar nada.
--    - Crea la base y TODAS las tablas si no existen
--    - Siembra roles, planes con feature flags, superadmin y restaurante demo
--
--  Ejecutar:  mysql -u root -p < migrations/bitemo_completo.sql
--  (o abrir este archivo en MySQL Workbench y ejecutarlo completo)
--
--  Credenciales que quedan creadas:
--    Superadmin        : admin@bitemo.com  / (definida al sembrar, no se publica)
--    Admin restaurante : demo@bitemo.com   / Demo2026*
--    Menú comensal     : http://localhost:5173/?mesa=bitemo-demo
-- ============================================================================

CREATE DATABASE IF NOT EXISTS menu_digital_saas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE menu_digital_saas;

-- ============================================================
-- 1. ESQUEMA
-- ============================================================

-- ---- Planes y feature flags ----
CREATE TABLE IF NOT EXISTS planes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  descripcion TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plan_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  feature VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_plan_feature (plan_id, feature),
  CONSTRAINT fk_pf_plan FOREIGN KEY (plan_id) REFERENCES planes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Tenants ----
CREATE TABLE IF NOT EXISTS restaurantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  logo_url VARCHAR(500) NULL,
  plan_id INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',  -- pendiente | activo | suspendido
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rest_plan FOREIGN KEY (plan_id) REFERENCES planes (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  plan_id INT NOT NULL,
  estado ENUM('activa','cancelada','vencida') NOT NULL DEFAULT 'activa',
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_susc_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_susc_plan FOREIGN KEY (plan_id) REFERENCES planes (id)
) ENGINE=InnoDB;

-- ---- Usuarios y roles ----
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  restaurante_id INT NULL,             -- NULL = usuario global (superadmin)
  role_id INT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usr_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_usr_rol FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB;

-- ---- Sucursales y mesas ----
CREATE TABLE IF NOT EXISTS sucursales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  direccion VARCHAR(250) NULL,
  telefono VARCHAR(30) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suc_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sucursal_id INT NOT NULL,
  numero_mesa VARCHAR(20) NOT NULL,
  codigo_qr_token VARCHAR(80) NOT NULL UNIQUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mesa_sucursal (sucursal_id, numero_mesa),
  CONSTRAINT fk_mesa_suc FOREIGN KEY (sucursal_id) REFERENCES sucursales (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Carta ----
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  orden INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_cat_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  video_url VARCHAR(500) NOT NULL,
  imagen_url VARCHAR(500) NULL,
  nivel_picante TINYINT NOT NULL DEFAULT 0,
  recomendado_chef TINYINT(1) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  orden INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plato_cat FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Inventario (ingredientes y recetas) ----
-- Los nombres de estas columnas NO son cosméticos: `ingredientes.model.js`
-- escribe y lee `costo_unitario` y `stock_actual`. Este archivo declaraba
-- `stock` (y nada de costo), así que una base creada desde cero respondía 500 a
-- POST /api/ingredientes mientras la de desarrollo —que nació de otro volcado y
-- sí tenía los nombres buenos— funcionaba. Se corrigió el 2026-09-15; las bases
-- que ya existían se igualan con 2026-09-15_saneo_esquema.sql.
CREATE TABLE IF NOT EXISTS ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  costo_unitario DECIMAL(10,4) NOT NULL DEFAULT 0,
  es_alergeno TINYINT(1) NOT NULL DEFAULT 0,
  stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0,
  unidad VARCHAR(20) NULL,
  CONSTRAINT fk_ing_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plato_ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plato_id INT NOT NULL,
  ingrediente_id INT NOT NULL,
  cantidad_usada DECIMAL(12,2) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_plato_ing (plato_id, ingrediente_id),
  CONSTRAINT fk_pi_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_ing FOREIGN KEY (ingrediente_id) REFERENCES ingredientes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Modificadores ("elige tu proteína", "adiciones", etc.) ----
CREATE TABLE IF NOT EXISTS grupos_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  min_seleccion INT NOT NULL DEFAULT 0,
  max_seleccion INT NOT NULL DEFAULT 1,
  es_obligatorio TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_gm_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opciones_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grupo_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  precio_adicional DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_om_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plato_grupos_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plato_id INT NOT NULL,
  grupo_id INT NOT NULL,
  UNIQUE KEY uq_pgm (plato_id, grupo_id),
  CONSTRAINT fk_pgm_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_pgm_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Combos ----
CREATE TABLE IF NOT EXISTS combos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  video_url VARCHAR(500) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_combo_rest FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS combo_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  combo_id INT NOT NULL,
  plato_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_combo_item (combo_id, plato_id),
  CONSTRAINT fk_ci_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Carrito (sesión anónima del comensal) ----
CREATE TABLE IF NOT EXISTS carritos (
  id CHAR(36) PRIMARY KEY,
  mesa_id INT NOT NULL,
  sesion_token VARCHAR(80) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_carrito (mesa_id, sesion_token),
  CONSTRAINT fk_carr_mesa FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carrito_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrito_id CHAR(36) NOT NULL,
  plato_id INT NULL,
  combo_id INT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  notas_instrucciones VARCHAR(500) NULL,
  CONSTRAINT fk_cd_carrito FOREIGN KEY (carrito_id) REFERENCES carritos (id) ON DELETE CASCADE,
  CONSTRAINT fk_cd_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_cd_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carrito_detalle_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrito_detalle_id INT NOT NULL,
  opcion_modificador_id INT NOT NULL,
  CONSTRAINT fk_cdm_det FOREIGN KEY (carrito_detalle_id) REFERENCES carrito_detalle (id) ON DELETE CASCADE,
  CONSTRAINT fk_cdm_op FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Pedidos (con precios congelados) y KDS ----
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT NOT NULL,
  sesion_token VARCHAR(80) NOT NULL,
  estado ENUM('Recibido','En Preparación','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Recibido',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ped_mesa FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalles_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  plato_id INT NULL,
  combo_id INT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_dp_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE SET NULL,
  CONSTRAINT fk_dp_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_detalle_modificadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id INT NOT NULL,
  opcion_modificador_id INT NOT NULL,
  precio_cobrado DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_pdm_det FOREIGN KEY (detalle_pedido_id) REFERENCES detalles_pedido (id) ON DELETE CASCADE,
  CONSTRAINT fk_pdm_op FOREIGN KEY (opcion_modificador_id) REFERENCES opciones_modificadores (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_tiempos_estados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  estado_cambiado ENUM('Recibido','En Preparación','Listo','Entregado','Cancelado') NOT NULL,
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pte_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Favoritos, recomendaciones y analítica ----
-- Favoritos (likes anónimos del comensal, sobre plato o combo)
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesion_token VARCHAR(80) NOT NULL,
  plato_id INT NULL,
  combo_id INT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fav_sesion (sesion_token),
  CONSTRAINT fk_fav_plato FOREIGN KEY (plato_id) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_combo FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recomendaciones cruzadas entre platos (motor IA)
CREATE TABLE IF NOT EXISTS recomendaciones_ia_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plato_id_origen INT NOT NULL,
  producto_id_recomendado INT NOT NULL,
  puntaje_afinidad DECIMAL(4,3) NOT NULL DEFAULT 0.5,
  UNIQUE KEY uq_reco (plato_id_origen, producto_id_recomendado),
  CONSTRAINT fk_reco_plato FOREIGN KEY (plato_id_origen) REFERENCES platos (id) ON DELETE CASCADE,
  CONSTRAINT fk_reco_reco FOREIGN KEY (producto_id_recomendado) REFERENCES platos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS analiticas_eventos_video (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sucursal_id INT NOT NULL,
  plato_id INT NULL,
  combo_id INT NULL,
  tipo_evento VARCHAR(40) NOT NULL,
  tiempo_segundos INT NULL,
  sesion_token VARCHAR(80) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_evento_plato (plato_id, tipo_evento),
  CONSTRAINT fk_ev_suc FOREIGN KEY (sucursal_id) REFERENCES sucursales (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- Personalización visual (Plan Intermedio+) ----
CREATE TABLE IF NOT EXISTS temas_restaurante (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL UNIQUE,
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
-- 2. DATOS INICIALES (INSERT IGNORE = no duplica si ya existen)
-- ============================================================

-- Roles
INSERT IGNORE INTO roles (id, nombre_rol) VALUES
  (1, 'superadmin'),
  (2, 'admin_restaurante'),
  (3, 'cocinero'),
  (4, 'mesero');

-- Planes comerciales. Precios en pesos colombianos (COP), sin decimales.
INSERT IGNORE INTO planes (id, nombre, precio, descripcion) VALUES
  (1, 'Básico', 99000, 'Carta digital con fotos y videos: categorías, productos, precios y orden de visualización.'),
  (2, 'Intermedio', 169900, 'Todo lo del Básico + personalización visual completa del menú (colores, tipografía, banner, tema).'),
  (3, 'Pro', 229900, 'Todo lo anterior + carrito de compras, envío automático a cocina y panel de cocina en tiempo real.');

-- Feature flags por plan
INSERT IGNORE INTO plan_features (plan_id, feature) VALUES
  (1, 'menu'),
  (2, 'menu'), (2, 'personalizacion'),
  (3, 'menu'), (3, 'personalizacion'), (3, 'carrito'), (3, 'kds');

-- Superadmin (password: (definida al sembrar, no se publica))
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, restaurante_id, role_id) VALUES
  (1, 'Juan Jose', 'admin@bitemo.com', '$2a$10$hz8HxbWBZ5l/jHnGtLI3sOyl9L8nOYWV8veI3cUmPu2cnCmT21PA6', NULL, 1);

-- ---- Restaurante demo: Casa Bitemo (Plan Pro, activo) ----
INSERT IGNORE INTO restaurantes (id, nombre, plan_id, estado) VALUES (100, 'Casa Bitemo', 3, 'activo');
INSERT IGNORE INTO suscripciones (id, restaurante_id, plan_id) VALUES (100, 100, 3);

-- Admin del restaurante demo (password: Demo2026*)
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, restaurante_id, role_id) VALUES
  (2, 'Demo Bitemo', 'demo@bitemo.com', '$2a$10$jEOsnVQ0pH21ZjdaWIR2qukUlzr10c/mKxp0yXX6KAvckCj4KPTRC', 100, 2);

-- Sucursal y mesas (mesa 1 con QR fijo para probar: ?mesa=bitemo-demo)
INSERT IGNORE INTO sucursales (id, restaurante_id, nombre, direccion, telefono) VALUES
  (100, 100, 'Sede Principal', 'Calle 10 # 5-23', '3001234567');
INSERT IGNORE INTO mesas (id, sucursal_id, numero_mesa, codigo_qr_token) VALUES
  (100, 100, '1', 'bitemo-demo'),
  (101, 100, '2', 'bitemo-demo-mesa-2');

-- Categorías (4) — el orden controla cómo las ve el cliente
INSERT IGNORE INTO categorias (id, restaurante_id, nombre, orden) VALUES
  (100, 100, 'Entradas', 0),
  (101, 100, 'Platos Fuertes', 1),
  (102, 100, 'Postres', 2),
  (103, 100, 'Bebidas', 3);

-- Platos: 3 videos por categoría (videos de muestra de dominio público)
INSERT IGNORE INTO platos (id, categoria_id, nombre, descripcion, precio, video_url, orden, nivel_picante, recomendado_chef) VALUES
  -- Entradas
  (100, 100, 'Carpaccio de Res', 'Láminas finas de res, rúgula fresca, parmesano y aceite de oliva al limón.', 24000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 0, 0, 1),
  (101, 100, 'Croquetas de Jamón', 'Croquetas cremosas doradas al momento con alioli suave de ajo asado.', 18000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 1, 0, 0),
  (102, 100, 'Ceviche de la Casa', 'Pesca del día marinada en leche de tigre, camote crocante y maíz cancha.', 28000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 2, 1, 0),
  -- Platos Fuertes
  (103, 101, 'Ribeye a la Brasa', '350 g de ribeye madurado, papas rústicas confitadas y chimichurri de la casa.', 62000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 0, 0, 1),
  (104, 101, 'Risotto de Hongos', 'Arroz arborio cremoso, mezcla de hongos silvestres y aceite de trufa.', 42000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 1, 0, 0),
  (105, 101, 'Pollo al Curry Rojo', 'Pollo en curry rojo tailandés con leche de coco, arroz jazmín y cilantro.', 38000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 2, 0),
  -- Postres
  (106, 102, 'Cheesecake de Frutos Rojos', 'Base de galleta artesanal, queso crema horneado y coulis de frutos rojos.', 18000, 'https://storage.googleapis.com/coverr-main/mp4/Food-Photography.mp4', 0, 0, 1),
  (107, 102, 'Brownie con Helado', 'Brownie de chocolate 70% tibio, helado de vainilla y nueces caramelizadas.', 16000, 'https://storage.googleapis.com/coverr-main/mp4/Cooking-Show.mp4', 1, 0, 0),
  (108, 102, 'Affogato Clásico', 'Helado de vainilla ahogado en espresso recién extraído y cacao amargo.', 14000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 0, 0),
  -- Bebidas
  (109, 103, 'Limonada de Hierbabuena', 'Limones exprimidos al momento con hierbabuena y jarabe natural.', 9000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 0, 0, 0),
  (110, 103, 'Sangría de la Casa', 'Vino tinto, frutas maceradas y un toque de brandy. Jarra para compartir.', 32000, 'https://storage.googleapis.com/coverr-main/mp4/Pouring-Drinks.mp4', 1, 0, 1),
  (111, 103, 'Cold Brew Tonic', 'Café de origen extraído en frío sobre tónica y cáscara de naranja.', 13000, 'https://storage.googleapis.com/coverr-main/mp4/Coffee-Made.mp4', 2, 0, 0);

-- Modificadores de ejemplo (grupo "Adiciones" aplicado al Cheesecake)
INSERT IGNORE INTO grupos_modificadores (id, restaurante_id, nombre, min_seleccion, max_seleccion, es_obligatorio) VALUES
  (100, 100, 'Adiciones', 0, 2, 0);
INSERT IGNORE INTO opciones_modificadores (id, grupo_id, nombre, precio_adicional) VALUES
  (100, 100, 'Extra frutos rojos', 3000),
  (101, 100, 'Chantilly', 2000);
INSERT IGNORE INTO plato_grupos_modificadores (plato_id, grupo_id) VALUES (106, 100);

-- Recomendaciones cruzadas de ejemplo
INSERT IGNORE INTO recomendaciones_ia_productos (plato_id_origen, producto_id_recomendado, puntaje_afinidad) VALUES
  (103, 110, 0.9),   -- Ribeye → Sangría
  (106, 108, 0.8),   -- Cheesecake → Affogato
  (100, 103, 0.7);   -- Carpaccio → Ribeye

-- Tema visual del restaurante demo
-- Sin colores ni tipografias: en NULL el menu hereda el diseno de Antojate.
-- Fijarlos aqui pisaba el design system en el menu del comensal.
INSERT IGNORE INTO temas_restaurante
  (id, restaurante_id, colores_categorias, modo)
VALUES
  (100, 100,
   '{"Entradas":"#6e8f5c","Platos Fuertes":"#e7a93c","Postres":"#d8482f","Bebidas":"#5cb8e4"}',
   'oscuro');

-- ============================================================
SELECT 'Base de datos Antojate lista.' AS resultado,
       (SELECT COUNT(*) FROM planes) AS planes,
       (SELECT COUNT(*) FROM restaurantes) AS restaurantes,
       (SELECT COUNT(*) FROM platos) AS platos;
