#!/bin/bash
# Carga el esquema de Bitemo la PRIMERA vez que arranca el contenedor de MySQL.
#
# Docker lo ejecuta solo si el volumen db_data está vacío (así funciona
# /docker-entrypoint-initdb.d). Eso importa: las migraciones de abajo no son
# idempotentes — son ADD COLUMN pelados, sin guarda —, así que correrlas dos
# veces falla con "Duplicate column name".
#
# Este archivo es la ÚNICA fuente de verdad del orden de carga. Si agregas una
# migración nueva, súmala al final del arreglo ORDEN.
set -euo pipefail

MIGRACIONES=/migrations

# bitemo_completo.sql lleva "USE menu_digital_saas" fijo adentro. Si DB_NAME
# fuera otro, el esquema se cargaría en una base distinta de la que usa el
# backend, y la app arrancaría contra una base vacía sin decir por qué.
# Mejor reventar aquí, fuerte y claro.
if [ "${MYSQL_DATABASE:-}" != "menu_digital_saas" ]; then
  echo "ERROR: DB_NAME debe ser 'menu_digital_saas' (recibido: '${MYSQL_DATABASE:-vacío}')." >&2
  echo "       El esquema base lo tiene fijo en un USE. Corrige el .env." >&2
  exit 1
fi

# El orden es deliberado y NO es alfabético.
#
# bitemo_completo.sql es el esquema consolidado al 2026-07-18: ya incluye todo
# lo que hace 2026-07-18_planes_features_temas.sql (plan_features,
# suscripciones, temas_restaurante, categorias.orden, platos.orden,
# platos.imagen_url, el estado 'Cancelado' en pedidos). Por eso esa migración
# NO va aquí: encima de completo revienta con "Duplicate column name 'orden'".
#
# Los otros dos archivos que quedan fuera a propósito:
#
#   2026-07-31_unificar_collation.sql
#     Es un parche para la base de desarrollo, que nació partida en dos
#     collations. Aquí la base nace unificada (ver el `command:` del servicio db
#     en docker-compose.yml). Aplicarlo convertiría 16 de las 28 tablas y
#     dejaría las otras 12 atrás — creando justo el bug de "Illegal mix of
#     collations" que ese archivo existe para arreglar.
#
#   bitemo_faltantes.sql
#     Sus 12 tablas ya están en completo. Servía para completar la base local.
ORDEN=(
  bitemo_completo.sql
  2026-07-21_platos_video_bunny.sql
  2026-07-22_platos_recomendado_horario.sql
  2026-07-22_restaurantes_moneda.sql
  2026-07-22_tema_layout_categorias.sql
  2026-07-31_tema_personalizacion_avanzada.sql
  2026-08-02_solicitudes_demo.sql
  2026-08-03_demo_videos_bunny.sql
  2026-08-04_llamados_mesero_y_bienvenida.sql
  2026-08-06_planes_precios_cop.sql
  # Estas ocho SÍ son idempotentes: consultan information_schema (o usan IF NOT EXISTS) antes de
  # tocar nada, así que se pueden volver a correr sin que reviente. Eso es lo
  # que permite aplicarlas a mano sobre una base que ya tiene datos —que es el
  # caso de producción, donde este script no se ejecuta nunca más.
  2026-08-10_analitica_indices.sql
  2026-08-10_planes_comerciales.sql
  2026-08-10_solicitudes_cuenta.sql
  2026-08-11_restaurantes_slug.sql
  2026-09-28_pagos_wompi.sql
  2026-09-28_recuperacion_password.sql
  2026-09-28_actualizado_en.sql
  2026-09-28_sesion_version.sql
)

for archivo in "${ORDEN[@]}"; do
  if [ ! -f "${MIGRACIONES}/${archivo}" ]; then
    echo "ERROR: falta ${MIGRACIONES}/${archivo}. ¿Se montó bien el volumen de migraciones?" >&2
    exit 1
  fi
  echo "==> Aplicando ${archivo}"
  # --default-character-set=utf8mb4 NO es opcional. El cliente mysql de esta
  # imagen arranca con character_set_client=latin1, así que sin la bandera lee
  # cada byte UTF-8 del archivo como latin1 y lo re-codifica al insertar: los
  # acentos quedan doble-codificados ("Láminas" -> "LÃ¡minas") y el menú del
  # comensal muestra basura. El daño es silencioso, no da ningún error.
  mysql --default-character-set=utf8mb4 \
        -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" \
        < "${MIGRACIONES}/${archivo}"
done

echo "==> Esquema de Bitemo cargado. Las semillas (roles, planes, superadmin y"
echo "    el restaurante demo) vienen dentro de bitemo_completo.sql: no hay que"
echo "    correr los scripts de seed a mano."
