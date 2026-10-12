-- ============================================================
-- Migración: Feature flags por plan, suscripciones, temas y orden de carta
-- Ejecutar sobre la base menu_digital_saas existente:
--   mysql -u root -p menu_digital_saas < migrations/2026-07-18_planes_features_temas.sql
-- ============================================================

-- 1. Feature flags por plan (controla qué módulos puede usar cada restaurante)
CREATE TABLE IF NOT EXISTS plan_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  feature VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_plan_feature (plan_id, feature),
  CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) REFERENCES planes (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- 2. Historial de suscripciones (cambios de plan por restaurante)
CREATE TABLE IF NOT EXISTS suscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  plan_id INT NOT NULL,
  estado ENUM('activa', 'cancelada', 'vencida') NOT NULL DEFAULT 'activa',
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_susc_restaurante FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_susc_plan FOREIGN KEY (plan_id) REFERENCES planes (id)
) ENGINE = InnoDB;

-- 3. Personalización visual por restaurante (Plan Intermedio en adelante)
CREATE TABLE IF NOT EXISTS temas_restaurante (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL UNIQUE,
  color_primario VARCHAR(9) NULL,
  color_fondo VARCHAR(9) NULL,
  color_botones VARCHAR(9) NULL,
  color_texto VARCHAR(9) NULL,
  tipografia_titulos VARCHAR(80) NULL,
  tipografia_cuerpo VARCHAR(80) NULL,
  colores_categorias JSON NULL,        -- ej. {"Entradas":"#aabbcc","Postres":"#ccddee"}
  iconografia VARCHAR(40) NULL,        -- ej. 'lineal' | 'relleno' | 'emoji'
  banner_url VARCHAR(500) NULL,
  portada_url VARCHAR(500) NULL,
  videos_destacados JSON NULL,         -- ej. [platoId, platoId]
  orden_visual JSON NULL,              -- ej. ["banner","destacados","categorias"]
  estilo_tarjetas VARCHAR(30) NULL,    -- ej. 'redondeado' | 'cuadrado' | 'flotante'
  config_navegacion JSON NULL,         -- ej. {"mostrarBusqueda":true,"posicion":"inferior"}
  modo ENUM('oscuro', 'claro') NOT NULL DEFAULT 'oscuro',
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tema_restaurante FOREIGN KEY (restaurante_id) REFERENCES restaurantes (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- 4. Orden de visualización de la carta + foto del plato
ALTER TABLE categorias ADD COLUMN orden INT NOT NULL DEFAULT 0;
ALTER TABLE platos ADD COLUMN orden INT NOT NULL DEFAULT 0;
ALTER TABLE platos ADD COLUMN imagen_url VARCHAR(500) NULL;

-- 5. Estados del restaurante (aprobación / suspensión por el superadmin)
ALTER TABLE restaurantes MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'activo';
-- valores usados: 'pendiente' | 'activo' | 'suspendido'

-- 6. Estado 'Cancelado' en pedidos
ALTER TABLE pedidos MODIFY estado ENUM('Recibido', 'En Preparación', 'Listo', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Recibido';
ALTER TABLE pedido_tiempos_estados MODIFY estado_cambiado ENUM('Recibido', 'En Preparación', 'Listo', 'Entregado', 'Cancelado') NOT NULL;
