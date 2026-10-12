-- Moneda en que el restaurante muestra los precios de su menú.
-- Código ISO 4217 (COP, USD, MXN, EUR, ARS, CLP, PEN…). Por defecto COP.
-- Aplica SIEMPRE (no depende del plan): es una configuración base del restaurante.

ALTER TABLE restaurantes
  ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT 'COP' AFTER logo_url;
