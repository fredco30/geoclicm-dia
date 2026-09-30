#!/bin/bash
# Backup PostgreSQL geoclicMédia — quotidien via cron.
# Base (.sql.gz) + médias (.tar.gz), 14 jours de rétention, copie hors
# serveur si BACKUP_REMOTE est défini (voir fin du script).
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

# Médias uploadés (photos, logos, images importées) : sans eux, une
# restauration de la base pointerait vers des fichiers absents.
MEDIA_DIR="/var/www/geoclicmedia/back/mediafiles"
MEDIA_FILE="$BACKUP_DIR/geoclicmedia-media-$TIMESTAMP.tar.gz"
if [ -d "$MEDIA_DIR" ]; then
    tar -czf "$MEDIA_FILE" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
    echo "[$(date -Is)] Médias OK ($(du -h "$MEDIA_FILE" | cut -f1))"
fi

# Rotation : supprime les backups > RETAIN_DAYS
find "$BACKUP_DIR" -name "geoclicmedia-*.gz" -mtime +$RETAIN_DAYS -delete
echo "[$(date -Is)] Rotation terminée (>$RETAIN_DAYS jours supprimés)"

# Copie hors serveur (optionnelle) : une sauvegarde sur le même VPS ne
# protège ni d'une panne disque ni d'une perte du serveur.
# Renseigner BACKUP_REMOTE dans /etc/default/geoclicmedia-backup, par ex. :
#   BACKUP_REMOTE="backup@stockage.example:/srv/backups/geoclicmedia/"
# (clé SSH dédiée, sans mot de passe, restreinte à rsync côté distant).
[ -f /etc/default/geoclicmedia-backup ] && . /etc/default/geoclicmedia-backup
if [ -n "${BACKUP_REMOTE:-}" ]; then
    rsync -a --delete "$BACKUP_DIR"/ "$BACKUP_REMOTE"
    echo "[$(date -Is)] Copie hors serveur OK → $BACKUP_REMOTE"
else
    echo "[$(date -Is)] ATTENTION : aucune copie hors serveur (BACKUP_REMOTE non défini)"
fi
