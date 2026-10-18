#!/usr/bin/env bash
# Backup diario de la base de datos MySQL de Antojate.
# Programar en cron (VPS):   0 3 * * *  /ruta/al/proyecto/backup.sh >> /var/log/bitemo-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"

# Carga DB_NAME y DB_ROOT_PASSWORD desde .env
set -a
# shellcheck disable=SC1091
source .env
set +a

STAMP=$(date +%Y%m%d_%H%M%S)
DIR="./backups"
mkdir -p "$DIR"
ARCHIVO="$DIR/bitemo_${STAMP}.sql.gz"

echo "==> Generando backup $ARCHIVO"
docker compose exec -T db mysqldump -u root -p"${DB_ROOT_PASSWORD}" "${DB_NAME}" | gzip > "$ARCHIVO"

# Conserva solo los últimos 14 días localmente
find "$DIR" -name 'bitemo_*.sql.gz' -mtime +14 -delete

echo "==> Backup local listo: $ARCHIVO"
echo "    IMPORTANTE: súbelo también a un destino OFFSITE (Backblaze B2, etc.) — ver DESPLIEGUE.md."
# Ejemplo offsite con rclone (configúralo antes):
#   rclone copy "$ARCHIVO" b2-bitemo:bitemo-backups/
