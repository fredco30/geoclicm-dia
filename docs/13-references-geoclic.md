# 13 — Patterns réutilisables depuis GéoClic Suite

Référence personnelle pour t'éviter de réinventer ce qui marche déjà dans GéoClic Suite. **Le dossier GéoClic n'est PAS dans ce projet** : il reste à son emplacement d'origine et sert uniquement de source d'inspiration ciblée.

> Chemin GéoClic sur ma machine : `C:\Users\projets\geoclic_final\`
>
> **Règle de base** : Le Camarguais doit rester **beaucoup plus simple** que GéoClic. GéoClic est un SaaS multi-tenant complexe avec SIG, signalements, gestion d'agents. Le Camarguais est un média local + régie pub. Ne pas reproduire la complexité GéoClic par réflexe.

## Comment utiliser cette référence

### Avec Claude Code

Quand tu veux qu'il s'inspire d'un pattern existant, donne-lui le chemin absolu et précise toujours "**inspire-toi**, ne copie pas verbatim" :

```
Pour l'upload d'images avec redimensionnement Pillow, inspire-toi
de C:\Users\projets\geoclic_final\apps\core\services\image_processing.py
mais adapte au modèle Media du Camarguais (plus simple, sans
multi-tenant).
```

### Pour toi-même

Avant de redemander à Claude Code de coder un truc, vérifie d'abord ici si tu as déjà la solution dans GéoClic. Gain de temps massif.

---

## ✅ Ce qui peut directement inspirer Le Camarguais

### Upload et traitement d'images

**Chez GéoClic** : `apps/core/services/image_processing.py` (ou équivalent)

Pattern à reprendre :
- Redimensionnement Pillow en 3 tailles (thumbnail 400px, medium 800px, large 1600px)
- Conversion automatique en WebP en gardant le JPG original
- Génération de hash pour déduplication
- Strip des métadonnées EXIF sensibles (géolocalisation auto)
- Validation des formats acceptés et taille max

À adapter : pas de multi-tenant, structure de dossiers `media/articles/YYYY/MM/`.

### Configuration Celery

**Chez GéoClic** : `config/celery.py` + `config/settings/base.py` (section CELERY_*)

Pattern à reprendre :
- Setup Celery avec Redis broker
- Auto-discovery des tasks dans les apps
- Configuration `CELERY_BEAT_SCHEDULE` pour tâches périodiques
- Logging centralisé des tâches

À adapter : moins de tâches au début (juste les futures Facebook publish + health checks).

### Settings Django split base/dev/prod

**Chez GéoClic** : `config/settings/{base,dev,prod}.py`

Pattern à reprendre :
- `base.py` : commun
- `dev.py` : DEBUG=True, SQLite ou PostgreSQL local, console email backend
- `prod.py` : DEBUG=False, PostgreSQL, sécurité headers, logging fichier
- Variables sensibles via `python-decouple` ou `django-environ` depuis `.env`

À adapter : ajouter une section `MEDIA_*` propre, pas de complexité multi-tenant.

### Vhost Nginx + SSL Let's Encrypt

**Chez GéoClic** : config Nginx du VPS (`/etc/nginx/sites-available/geoclic.fr`)

Pattern à reprendre :
- Reverse proxy vers gunicorn et Next.js
- SSL avec Let's Encrypt
- Headers de sécurité (HSTS, X-Frame-Options, CSP basique)
- Cache statique avec `expires` long sur `/media/` et `/static/`
- Redirection HTTP → HTTPS
- Logs séparés access/error

À adapter : ports différents (Django 8001 / Next 3001), certificat dédié pour {{DOMAIN}}, vhost séparé.

### Service systemd pour Django

**Chez GéoClic** : `/etc/systemd/system/geoclic-*.service`

Pattern à reprendre :
- Service gunicorn pour Django avec workers configurés
- Service Celery worker
- Service Celery Beat
- Restart automatique en cas de crash
- Logs vers journald
- User dédié non-root pour l'exécution

À adapter : préfixer tous les services par `lecamarguais-` pour éviter conflits avec GéoClic.

### Génération PDF avec ReportLab

**Chez GéoClic** : `apps/exports/services/pdf_generator.py` (et autres)

Pattern à reprendre (utile au sprint 4 pour les factures) :
- Setup canvas avec marges et tailles
- Header/footer avec logo et coordonnées
- Tableaux avec styles
- Gestion des polices custom

À adapter : factures plus simples (pas de devis multi-pages complexes au début).

### Custom User model + 2FA admin

**Chez GéoClic** : `apps/core/models.py` (User custom) + config `django-otp`

Pattern à reprendre :
- AbstractUser custom dès le début
- 2FA TOTP obligatoire pour les staff
- Email comme identifiant principal (optionnel)
- Champs supplémentaires (phone, avatar, etc.)

À adapter : rôle `advertiser` en plus, pas de hiérarchie complexe d'agents.

### Backup PostgreSQL automatisé

**Chez GéoClic** : script bash + cron

Pattern à reprendre :
- Dump PostgreSQL quotidien
- Compression gzip
- Rotation (garder 7 daily, 4 weekly, 12 monthly)
- Optionnel : copie vers stockage distant
- Notification email en cas d'échec

À adapter : nom de base différent, dossier de stockage séparé.

### CI/CD basique

**Chez GéoClic** : workflow GitHub Actions ou script de déploiement

Pattern à reprendre :
- `git pull` + install deps + migrate + collectstatic + restart services
- Déploiement manuel via SSH au début
- Plus tard : workflow GitHub Actions automatisé

---

## ❌ Ce qu'il NE FAUT PAS copier de GéoClic

Ces choses sont spécifiques à un SaaS B2B collectivités et inutiles voire nuisibles pour un média local :

- **Multi-tenant** : Le Camarguais a UNE base de données pour tout, pas un schéma par client
- **Modèles SIG complexes** (couches, layers, projections multiples) : on a juste besoin de PointField pour géolocaliser articles/événements/commerces
- **Système de licences communes** : pas de notion de "client collectivité", uniquement des annonceurs commerçants
- **Modules signalement/agents/citoyens** : c'est le métier de GéoClic, pas du Camarguais
- **Dashboards analytiques lourds** : on utilise Plausible côté analytics, pas de gros pipeline data
- **Workflows de validation à plusieurs étapes** : la modération d'une fiche commerçant = 1 personne, 1 clic
- **Architecture micro-services Docker** : on reste sur un Django + Next monolithique simple

---

## Patterns à NE PAS reprendre de GéoClic même s'ils existent

Ce sont des erreurs ou de la dette technique que je ne veux pas reproduire :

- *(à compléter au fur et à mesure si je vois des trucs à éviter)*

---

## Briques externes communes aux deux projets

Pour cohérence sur le VPS et faciliter la maintenance :

| Brique | Version GéoClic | Version Camarguais | Mutualisable ? |
|--------|-----------------|--------------------|--------------------|
| PostgreSQL | 16 | 16 | ✅ Même instance, base séparée |
| Redis | 7.x | 7.x | ✅ Même instance, DB index séparé |
| Nginx | 1.24+ | 1.24+ | ✅ Vhosts séparés sur même process |
| Python | 3.12 | 3.12 | venv séparés |
| Node.js | 20 LTS | 20 LTS | versions séparées si besoin via nvm |
| Let's Encrypt | certbot | certbot | ✅ Même certbot, certificats séparés |

**Important** : utiliser un index Redis différent pour Le Camarguais (ex: `redis://localhost:6379/2`) pour éviter les collisions de cache et de queues Celery avec GéoClic.

---

## Prompt à intégrer dans Claude Code

À ajouter au prompt de kickoff (section DOCUMENTATION DE RÉFÉRENCE) :

```
Sur ma machine j'ai aussi mon SaaS GéoClic Suite à
C:\Users\projets\geoclic_final\ qui partage une grande partie de
la stack technique (Django 5, Celery, Pillow, Nginx, systemd).
Je m'en sers comme référence personnelle.

Le fichier docs/13-references-geoclic.md liste précisément les
patterns que je veux réutiliser et ceux que je veux éviter.

Si tu as besoin de voir comment j'ai fait un truc spécifique
chez GéoClic, demande-moi et je te donnerai le chemin précis
du fichier. Mais ne va pas explorer ce dossier de toi-même :
Le Camarguais doit rester architecturalement plus simple que
GéoClic.
```
