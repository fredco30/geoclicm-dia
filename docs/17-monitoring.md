# 17 — Monitoring : UptimeRobot + journaux

Comment être averti si le site tombe + où regarder en cas de problème.

---

## 🚨 UptimeRobot — alerte uptime gratuite

UptimeRobot surveille des URLs depuis l'extérieur (depuis leurs serveurs) et t'envoie un email si une URL ne répond plus.

### Configuration (5 minutes)

1. Crée un compte gratuit sur **https://uptimerobot.com/** (50 monitors gratuits, check toutes les 5 min)
2. Connecte-toi → **+ Add New Monitor**
3. Crée 2 monitors :

#### Monitor 1 — site public
- **Monitor Type** : `HTTPS`
- **Friendly Name** : `geoclicMédia — site public`
- **URL** : `https://media.geoclic.fr/`
- **Monitoring Interval** : 5 minutes
- **Monitor Timeout** : 30 secondes
- **Alert Contacts** : ton email

#### Monitor 2 — healthcheck Django
- **Monitor Type** : `HTTPS — Keyword`
- **Friendly Name** : `geoclicMédia — API healthz`
- **URL** : `https://media.geoclic.fr/healthz/`
- **Keyword** : `ok`
- **Alert Type** : Alert when keyword **exists**
- **Monitoring Interval** : 5 minutes

> 💡 Le 2e monitor vérifie que **le JSON `{"status": "ok"}` est bien renvoyé**, donc que Django + DB répondent. Pas juste qu'on a un 200 (un Nginx qui tourne tout seul renverrait 502 mais pas un 200 trompeur).

4. **Save**.

UptimeRobot enverra un email à chaque incident (DOWN) et à chaque récupération (UP).

---

## 📋 Status page publique (optionnel)

Tu peux activer une page status publique via **Add New Status Page** :
- **URL personnalisée** : `https://stats.uptimerobot.com/<ton-id>`
- **Visible** : public

À mettre en bookmark ou à donner à ta partenaire pour qu'elle voie l'historique des incidents.

---

## 📊 Logs et journaux

### Logs en temps réel (sur le VPS)

```bash
# Django (gunicorn, via systemd journal)
sudo journalctl -u geoclicmedia-django -f

# Next.js (output systemd)
sudo journalctl -u geoclicmedia-next -f

# Celery worker
sudo journalctl -u geoclicmedia-celery-worker -f

# Nginx access
sudo tail -f /var/log/nginx/geoclicmedia-access.log

# Nginx errors
sudo tail -f /var/log/nginx/geoclicmedia-error.log

# Backup PG quotidien
sudo tail -f /var/log/geoclicmedia-backup.log
```

### Logs gunicorn dédiés

```bash
sudo tail -f /var/log/geoclicmedia-django-access.log
sudo tail -f /var/log/geoclicmedia-django-error.log
```

### Filtrer les erreurs des dernières 24h

```bash
sudo journalctl -u geoclicmedia-django --since "24 hours ago" -p err --no-pager
```

---

## 🔍 Diagnostic rapide en cas de panne

Si UptimeRobot t'alerte, lance sur le VPS :

```bash
# 1) État des services (tous doivent être "active")
for s in geoclicmedia-django geoclicmedia-next geoclicmedia-celery-worker geoclicmedia-celery-beat nginx postgresql redis-server; do
  echo "$s: $(sudo systemctl is-active $s)"
done

# 2) Espace disque (saturé si < 1Go libre)
df -h /

# 3) RAM dispo
free -h

# 4) Tester l'API depuis le VPS
curl -sI https://media.geoclic.fr/healthz/

# 5) Erreurs Django récentes
sudo journalctl -u geoclicmedia-django -n 50 --no-pager | grep -iE "error|exception|critical"
```

### Restart d'urgence

```bash
# Tout restart
sudo systemctl restart geoclicmedia-django geoclicmedia-next geoclicmedia-celery-worker geoclicmedia-celery-beat nginx

# OU service par service selon le diag
sudo systemctl restart geoclicmedia-django
```

---

## 💾 Vérifier les backups

```bash
ls -lah /var/backups/geoclicmedia/
```

Tu dois voir des fichiers `geoclicmedia-YYYYMMDD-HHMMSS.sql.gz`, un par jour (rétention 14j).

### Tester un restore (sur DB de test, jamais en prod !)

```bash
# Créer une DB de test
sudo -u postgres createdb geoclicmedia_db_test

# Restaurer le dernier backup dedans
LATEST=$(ls -t /var/backups/geoclicmedia/*.sql.gz | head -1)
gunzip -c "$LATEST" | sudo -u postgres psql geoclicmedia_db_test
echo "Restore depuis: $LATEST"

# Vérifier
sudo -u postgres psql geoclicmedia_db_test -c "SELECT COUNT(*) FROM editorial_article;"

# Nettoyer
sudo -u postgres dropdb geoclicmedia_db_test
```

---

## 🔄 Renouvellement HTTPS (automatique)

Let's Encrypt expire tous les 90 jours. Certbot a une tâche cron qui renouvelle automatiquement quand il reste < 30 jours. Pour vérifier :

```bash
# Liste des certificats et dates d'expiration
sudo certbot certificates

# Forcer une simulation de renouvellement (dry-run)
sudo certbot renew --dry-run
```

Si tu vois `Congratulations, all renewals succeeded`, tout est OK.

> ℹ️ Si certbot rate son renouvellement (réseau, Hostinger qui change ses NS, etc.), UptimeRobot t'alertera car le certificat invalidé bloquera l'accès HTTPS.

---

## 🩺 Checklist hebdomadaire

- [ ] Aucun incident UptimeRobot la semaine
- [ ] `df -h /` : disque < 80%
- [ ] `ls /var/backups/geoclicmedia/ | wc -l` : 14 fichiers (1 par jour, rétention OK)
- [ ] `sudo certbot certificates` : expire dans plus de 30 jours
- [ ] `sudo journalctl -u geoclicmedia-django --since "7 days ago" -p err` : pas d'erreurs critiques

## Mise à jour d'exploitation — 28 juillet 2026

### Sauvegardes : correction importante

Le script `/usr/local/bin/geoclicmedia-backup-pg` est installé et deux backups
manuels du 27 juillet ont été constatés. En revanche, aucune crontab `ubuntu`,
aucune crontab root et aucun timer systemd associé n'ont été trouvés.

La sauvegarde quotidienne n'est donc **pas automatisée à ce jour**. Après mise
en place de la planification, vérifier le lendemain la création réelle d'un
nouveau fichier, puis tester une restauration dans une base séparée.

Contrôle de la planification :

```bash
crontab -l
sudo crontab -l
sudo systemctl list-timers --all | grep -i geoclicmedia
```

### Agenda et Crawl4AI

```bash
# Services de collecte
sudo systemctl is-active geoclicmedia-celery-worker
sudo systemctl is-active geoclicmedia-celery-beat
sudo docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' geoclicmedia-crawl4ai

# Logs des dernières 24 heures
sudo journalctl -u geoclicmedia-celery-worker --since "24 hours ago" --no-pager
sudo journalctl -u geoclicmedia-celery-beat --since "24 hours ago" --no-pager
sudo docker logs --since 24h geoclicmedia-crawl4ai

# Une requête anonyme doit être refusée
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST http://127.0.0.1:11235/crawl \
  -H 'Content-Type: application/json' \
  -d '{"urls":["https://example.com"]}'
```

Le dernier code attendu est `401`. Ne jamais afficher les tokens ou secrets
dans les logs, la documentation ou une commande copiée dans une conversation.

### Risque système

Le VPS a été vérifié sous Ubuntu 25.04, version hors support. Préparer une mise
à niveau avec sauvegarde restaurable, inventaire des services, fenêtre de
maintenance et smoke tests complets. Ne pas mélanger cette opération avec un
lot fonctionnel Agenda.
