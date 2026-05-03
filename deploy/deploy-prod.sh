#!/bin/bash
# Script de déploiement prod ÉTAPE 6 — geoclicMédia.
#
# À LANCER UNE SEULE FOIS pour configurer Nginx + Let's Encrypt + gunicorn + Celery + backup.
# Idempotent : peut être relancé sans casser quoi que ce soit.
#
# Usage : sudo bash /var/www/geoclicmedia/deploy/deploy-prod.sh

set -euo pipefail

PROJECT_DIR="/var/www/geoclicmedia"
DEPLOY_DIR="$PROJECT_DIR/deploy"
DOMAIN="media.geoclic.fr"
EMAIL="contact@geoclic.fr"  # à modifier si besoin

echo "=== 1/8 : Vérifications préalables ==="
[ -d "$PROJECT_DIR/back/.venv" ] || { echo "venv Django absent"; exit 1; }
[ -d "$PROJECT_DIR/front/.next" ] || { echo "build Next.js absent"; exit 1; }
[ -f "$PROJECT_DIR/back/.env" ] || { echo ".env Django absent"; exit 1; }

echo "=== 2/8 : Installer gunicorn dans le venv (si pas déjà) ==="
"$PROJECT_DIR/back/.venv/bin/pip" install -q gunicorn whitenoise sentry-sdk

echo "=== 3/8 : Collecter les statics Django ==="
sudo -u ubuntu bash -c "cd $PROJECT_DIR/back && \
  DJANGO_SETTINGS_MODULE=config.settings.prod \
  $PROJECT_DIR/back/.venv/bin/python manage.py collectstatic --noinput"

echo "=== 4/8 : Installer/mettre à jour les services systemd ==="
# Stop les anciens services dev (runserver) si présents
systemctl stop geoclicmedia-django 2>/dev/null || true
systemctl disable geoclicmedia-django 2>/dev/null || true

cp "$DEPLOY_DIR/geoclicmedia-django.service" /etc/systemd/system/
cp "$DEPLOY_DIR/geoclicmedia-celery-worker.service" /etc/systemd/system/
cp "$DEPLOY_DIR/geoclicmedia-celery-beat.service" /etc/systemd/system/

# Logs touch + permissions
touch /var/log/geoclicmedia-django-access.log /var/log/geoclicmedia-django-error.log
touch /var/log/geoclicmedia-celery-worker.log /var/log/geoclicmedia-celery-beat.log
chown ubuntu:ubuntu /var/log/geoclicmedia-*.log

systemctl daemon-reload
systemctl enable --now geoclicmedia-django geoclicmedia-celery-worker geoclicmedia-celery-beat

echo "=== 5/8 : Configurer Nginx vhost ==="
cp "$DEPLOY_DIR/nginx-media.geoclic.fr.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

# Test config et reload
nginx -t
systemctl reload nginx

echo "=== 6/8 : Let's Encrypt (certbot) ==="
if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" --redirect
else
    echo "Cert déjà présent pour $DOMAIN — skip"
fi

echo "=== 7/8 : Backup PostgreSQL quotidien ==="
cp "$DEPLOY_DIR/backup-pg.sh" /usr/local/bin/geoclicmedia-backup-pg
chmod +x /usr/local/bin/geoclicmedia-backup-pg
mkdir -p /var/backups/geoclicmedia
chown ubuntu:ubuntu /var/backups/geoclicmedia
touch /var/log/geoclicmedia-backup.log
chown ubuntu:ubuntu /var/log/geoclicmedia-backup.log

# Cron quotidien à 3h00 pour ubuntu
CRON_LINE="0 3 * * * /usr/local/bin/geoclicmedia-backup-pg >> /var/log/geoclicmedia-backup.log 2>&1"
( crontab -u ubuntu -l 2>/dev/null | grep -v "geoclicmedia-backup-pg" ; echo "$CRON_LINE" ) | crontab -u ubuntu -

echo "=== 8/8 : Tests post-déploiement ==="
sleep 3
echo
systemctl is-active geoclicmedia-django || true
systemctl is-active geoclicmedia-celery-worker || true
systemctl is-active geoclicmedia-celery-beat || true
systemctl is-active geoclicmedia-next || true
systemctl is-active nginx || true
echo
echo "=== Test https://$DOMAIN/ ==="
curl -sI "https://$DOMAIN/" | head -5 || echo "(pas encore accessible — DNS ?)"

echo
echo "✅ Déploiement prod terminé."
echo
echo "Vérifie :"
echo "  - https://$DOMAIN/                   (Next.js)"
echo "  - https://$DOMAIN/admin/              (Django admin)"
echo "  - https://$DOMAIN/api/articles/       (API)"
echo "  - https://$DOMAIN/admin/login         (back-office custom)"
