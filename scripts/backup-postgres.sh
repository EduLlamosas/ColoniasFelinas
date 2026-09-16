#!/usr/bin/env bash
# Backup diario del censo (Postgres) y de las fotos/documentos RGPD (backend/uploads, que NO
# vive en el volumen de Postgres) en una carpeta local del propio VPS, con rotación automática.
#
# IMPORTANTE - qué protege esto y qué no:
#   - SÍ protege de errores humanos/operativos: un `docker volume rm` sin querer, un DELETE o una
#     migración que sale mal, restaurar sin querer un estado viejo, corrupción lógica de datos.
#   - NO protege de perder el disco o el VPS entero: la copia vive en el mismo disco físico que
#     el original, así que un fallo de disco o un problema del proveedor se lleva las dos por
#     igual. Para eso hace falta que la copia viva fuera de este servidor (subida a otro sitio) -
#     se dejó pendiente por el coste de activar Object Storage en OVH (pide tarjeta y un cargo de
#     ~12€ de crédito cloud prepagado solo para activar el proyecto).
#
# Pensado para lanzarse por cron en el propio VPS de producción, desde la raíz del proyecto:
#   0 4 * * * /ruta/al/proyecto/scripts/backup-postgres.sh >> /var/log/colonias-backup.log 2>&1
set -euo pipefail

# Cuántos días de copias se conservan antes de borrar las más viejas - sin esto, la carpeta de
# backups crecería sin límite y acabaría comiéndose el mismo disco que se supone que protege.
DIAS_RETENCION=7

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DIR_BACKUPS="$(pwd)/backups"
mkdir -p "$DIR_BACKUPS"

FECHA="$(date +%Y-%m-%d_%H-%M-%S)"
DIR_TEMPORAL="$(mktemp -d)"
trap 'rm -rf "$DIR_TEMPORAL"' EXIT

echo "[$FECHA] Volcando Postgres..."
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U postgres colonias_db | gzip > "$DIR_TEMPORAL/colonias_db_$FECHA.sql.gz"

echo "[$FECHA] Empaquetando backend/uploads (fotos, documentos de cesión RGPD)..."
tar -czf "$DIR_TEMPORAL/uploads_$FECHA.tar.gz" -C backend uploads

mv "$DIR_TEMPORAL/colonias_db_$FECHA.sql.gz" "$DIR_TEMPORAL/uploads_$FECHA.tar.gz" "$DIR_BACKUPS/"

echo "[$FECHA] Borrando copias con más de $DIAS_RETENCION días..."
find "$DIR_BACKUPS" -name '*.sql.gz' -mtime "+$DIAS_RETENCION" -delete
find "$DIR_BACKUPS" -name '*.tar.gz' -mtime "+$DIAS_RETENCION" -delete

echo "[$FECHA] Backup completado correctamente en $DIR_BACKUPS."
