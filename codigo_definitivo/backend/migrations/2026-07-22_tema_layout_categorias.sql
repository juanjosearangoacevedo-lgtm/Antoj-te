-- Diseño con que el comensal ve la selección de categorías:
--   'cuadricula'       -> tarjetas en 2 columnas (por defecto)
--   'pantalla_completa'-> mosaicos grandes a todo el ancho (inmersivo)
-- Es una opción de personalización del restaurante.

ALTER TABLE temas_restaurante
  ADD COLUMN layout_categorias VARCHAR(20) NULL AFTER estilo_tarjetas;
