-- ============================================================================
-- Personalización visual avanzada
--
-- Agrega a `temas_restaurante` las columnas que faltaban para que el
-- administrador pueda configurar animaciones, vistas previas de categoría y
-- comportamiento visual sin tocar código.
--
-- Convención importante: TODAS las columnas nuevas admiten NULL y su valor por
-- defecto es NULL, no un valor concreto. NULL o cadena vacía significa
-- "usa el valor por defecto de la plataforma". Así el restaurante que no
-- personaliza nada hereda el diseño de Antojate, y una opción que se limpia
-- vuelve al default en vez de quedarse congelada en un valor viejo.
-- ============================================================================

ALTER TABLE temas_restaurante
  -- Animaciones: 'completas' | 'sutiles' | 'ninguna'
  ADD COLUMN animaciones VARCHAR(20) NULL AFTER modo,
  -- Velocidad de transiciones: 'lenta' | 'normal' | 'rapida'
  ADD COLUMN velocidad_animacion VARCHAR(20) NULL AFTER animaciones,
  -- Qué se muestra en la tarjeta de cada categoría antes de entrar:
  -- 'imagen' | 'video' | 'animacion' | 'ninguna'
  ADD COLUMN preview_categoria VARCHAR(20) NULL AFTER velocidad_animacion,
  -- Radio de esquinas: 'recto' | 'suave' | 'medio' | 'redondo'
  ADD COLUMN radio_esquinas VARCHAR(20) NULL AFTER preview_categoria,
  -- Sombras: 'ninguna' | 'sutil' | 'marcada'
  ADD COLUMN sombras VARCHAR(20) NULL AFTER radio_esquinas,
  -- Densidad del espaciado: 'compacto' | 'normal' | 'amplio'
  ADD COLUMN espaciado VARCHAR(20) NULL AFTER sombras,
  -- Altura de las tarjetas de categoría: 'baja' | 'media' | 'alta'
  ADD COLUMN altura_categoria VARCHAR(20) NULL AFTER espaciado,
  -- Relleno de los botones: 'solido' | 'contorno' | 'suave'
  ADD COLUMN estilo_botones VARCHAR(20) NULL AFTER altura_categoria,
  -- Forma de los botones: 'redondeado' | 'pildora' | 'recto'
  ADD COLUMN forma_botones VARCHAR(20) NULL AFTER estilo_botones,
  -- Oscurecimiento sobre la foto de la categoría, 0-100 (legibilidad del texto)
  ADD COLUMN opacidad_overlay TINYINT UNSIGNED NULL AFTER forma_botones,
  -- Mostrar el precio sobre el video en el feed: 1 | 0
  ADD COLUMN mostrar_precio_feed TINYINT(1) NULL AFTER opacidad_overlay;

-- Los temas ya existentes se sembraron con la paleta anterior al rediseño de
-- marca (#e7a93c dorado, #0f0d0b carbón, #f5f1e8 crema), lo que pisaba los
-- colores de Antojate en el menú del comensal. Se limpian esos cuatro campos
-- para que vuelvan a heredar el default; el restaurante que quiera su propia
-- paleta la vuelve a elegir desde el panel.
UPDATE temas_restaurante
SET color_primario = NULL,
    color_fondo    = NULL,
    color_botones  = NULL,
    color_texto    = NULL
WHERE color_primario = '#e7a93c'
   OR color_fondo    = '#0f0d0b'
   OR color_texto    = '#f5f1e8';

-- El diseño de categorías a pantalla completa pasa a ser el valor por defecto
-- de la plataforma: las cadenas vacías dejan de significar "cuadrícula".
UPDATE temas_restaurante SET layout_categorias = NULL WHERE layout_categorias = '';
UPDATE temas_restaurante SET estilo_tarjetas   = NULL WHERE estilo_tarjetas   = '';
UPDATE temas_restaurante SET tipografia_titulos = NULL WHERE tipografia_titulos = '';
UPDATE temas_restaurante SET tipografia_cuerpo  = NULL WHERE tipografia_cuerpo  = '';
