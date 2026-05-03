#!/bin/bash
# Backup PostgreSQL geoclicMédia — quotidien via cron.
# Conserve 14 jours de backups, compresse en .sql.gz.
#
# Install :
#   sudo cp backup-pg.sh /usr/local/bin/geoclicmedia-backup-pg
#   sudo chmod +x /usr/local/bin/geoclicmedia-backup-pg
#   sudo mkdir -p /var/backups/geoclicmedia
#   sudo chown ubuntu:ubuntu /var/backups/geoclicmedia
#   crontab -e  (en tant qu'ubuntu) :
#     0 3 * * * /usr/local/bin/geoclicmedia-backup-pg >> /var/log/geoclicmedia-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/var/backups/geoclicmedia"
DB_NAME="geoclicmedia_db"
DB_USER="geoclicmedia_user"
RETAIN_DAYS=14

# Charger DB_PASSWORD depuis le .env Django
ENV_FILE="/var/www/geoclicmedia/back/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERREUR : $ENV_FILE introuvable"
    exit 1
fi
DB_PASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/geoclicmedia-$TIMESTAMP.sql.gz"

echo "[$(date -Is)] Backup → $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h localhost \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Is)] OK ($SIZE)"

# Rotation : supprime les backups > RETAIN_DAYS
find "$BACKUP_DIR" -name "geoclicmedia-*.sql.gz" -mtime +$RETAIN_DAYS -delete
echo "[$(date -Is)] Rotation terminée (>$RETAIN_DAYS jours supprimés)"
