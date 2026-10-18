#!/usr/bin/env bash
# Despliega o actualiza Antojate en el VPS.
# Uso:  ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: falta el archivo .env (copia .env.example a .env y complétalo)." >&2
  exit 1
fi

echo "==> Construyendo y levantando contenedores…"
docker compose up -d --build

echo "==> Limpiando imágenes viejas…"
docker image prune -f

echo "==> Estado:"
docker compose ps

echo ""
echo "Listo. Si es la PRIMERA vez, importa el esquema y las semillas (ver DESPLIEGUE.md)."
