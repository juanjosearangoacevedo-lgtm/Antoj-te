-- ============================================================
-- Recomendación del chef programable por días de la semana y/o rango horario.
-- Ejecutar UNA sola vez.
--
--   recomendado_chef        -> interruptor maestro (ya existía)
--   recomendado_dias        -> días en que aplica, formato CSV con la convención
--                              de MySQL DAYOFWEEK: 1=Domingo … 7=Sábado
--                              (ej. "2,3,4,5,6" = Lun a Vie). NULL/'' = todos los días.
--   recomendado_hora_inicio -> hora desde la que aplica (NULL = todo el día)
--   recomendado_hora_fin    -> hora hasta la que aplica (NULL = todo el día)
--
-- La recomendación "vigente ahora" = recomendado_chef=1 Y (día coincide) Y (hora dentro del rango).
-- Se calcula al vuelo en el feed público (ver platos.service.feedPublico).
-- ============================================================

ALTER TABLE platos
  ADD COLUMN recomendado_dias VARCHAR(20) NULL AFTER recomendado_chef,
  ADD COLUMN recomendado_hora_inicio TIME NULL AFTER recomendado_dias,
  ADD COLUMN recomendado_hora_fin TIME NULL AFTER recomendado_hora_inicio;
