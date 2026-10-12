-- ============================================================================
-- Solicitudes de demo: el formulario público de la landing.
--
-- Quien escribe aquí TODAVÍA NO es cliente, así que la tabla no tiene FK a
-- `restaurantes` ni a `usuarios`: es justamente el paso previo al alta. El día
-- que una solicitud se convierte, se crea el restaurante por el flujo normal y
-- la solicitud queda marcada como 'cerrada' con su nota.
--
-- La collation va explícita a propósito: la base ya se partió una vez en dos
-- collations (ver 2026-07-31_unificar_collation.sql) y cualquier JOIN entre
-- tablas con collations distintas revienta.
-- ============================================================================

CREATE TABLE solicitudes_demo (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Datos del restaurante
  restaurante_nombre VARCHAR(150) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  direccion VARCHAR(255) NULL,

  -- Datos de contacto
  contacto_nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  mensaje TEXT NULL,

  -- Seguimiento comercial
  estado ENUM('nueva', 'contactada', 'cerrada') NOT NULL DEFAULT 'nueva',
  nota_interna TEXT NULL,

  -- `ip_origen` solo sirve para frenar el envío masivo desde una misma fuente.
  -- 45 caracteres porque una IPv6 completa ocupa hasta 45.
  ip_origen VARCHAR(45) NULL,

  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Listado del panel: primero las nuevas, y dentro de cada estado por fecha.
  INDEX idx_estado_creado (estado, creado_en),
  -- Lo consulta el límite por IP en cada envío; sin índice haría full scan.
  INDEX idx_ip_creado (ip_origen, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
