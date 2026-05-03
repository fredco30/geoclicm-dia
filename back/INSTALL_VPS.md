# Installation VPS — geoclicMédia

Procédure pour préparer le VPS `135.125.159.142` (Ubuntu 25.04) à recevoir geoclicMédia.

**Pré-requis** : SSH au VPS en tant que `ubuntu` avec sudo.

---

## 1. PostgreSQL 17 + PostGIS 3 + extensions

Ubuntu 25.04 (Plucky) ships PostgreSQL 17 par défaut.

```bash
# Mise à jour des index apt
sudo apt update

# Installer PG 17, PostGIS 3, et les libs GDAL/GEOS pour Django GIS plus tard
sudo apt install -y \
  postgresql-17 \
  postgresql-17-postgis-3 \
  postgresql-client-17 \
  gdal-bin libgdal-dev

# Vérifier
psql --version             # → psql (PostgreSQL) 17.x
sudo systemctl status postgresql --no-pager | head -10
```

PostgreSQL doit être démarré et écouter par défaut sur `127.0.0.1:5432` (vérifier avec `sudo ss -tlnp | grep 5432`).

> Si le port 5432 ressort sur `0.0.0.0`, on le restreindra à `localhost` plus tard pour la sécurité (le tunnel SSH suffit).

---

## 2. Créer la base et l'utilisateur dédiés

Génère un mot de passe fort **avant** :

```bash
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)
echo "DB_PASSWORD = $DB_PASSWORD"
# COPIE ce mot de passe — tu le mettras dans .env Windows et .env prod VPS
```

Puis :

```bash
sudo -u postgres psql <<EOF
-- 1. User dédié
CREATE USER geoclicmedia_user WITH PASSWORD '$DB_PASSWORD';

-- 2. Base dédiée
CREATE DATABASE geoclicmedia_db
  OWNER geoclicmedia_user
  ENCODING 'UTF8'
  LC_COLLATE 'fr_FR.UTF-8'
  LC_CTYPE 'fr_FR.UTF-8'
  TEMPLATE template0;

-- 3. Privilèges sur la base
GRANT ALL PRIVILEGES ON DATABASE geoclicmedia_db TO geoclicmedia_user;
EOF

# 4. Activer PostGIS dans la base (à faire en superuser sur la DB cible)
sudo -u postgres psql -d geoclicmedia_db <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- recherche fuzzy
CREATE EXTENSION IF NOT EXISTS unaccent;      -- recherche sans accents

-- Donner droits sur le schéma public au user (PG 15+ a verrouillé ça)
GRANT ALL ON SCHEMA public TO geoclicmedia_user;
ALTER SCHEMA public OWNER TO geoclicmedia_user;

SELECT PostGIS_Version();
EOF
```

**Vérifier** :

```bash
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U geoclicmedia_user -d geoclicmedia_db -c "SELECT version(), PostGIS_Version();"
```

Tu dois voir la version PG + PostGIS. ✅

---

## 3. Installer Redis

```bash
sudo apt install -y redis-server

# Activer + démarrer
sudo systemctl enable redis-server --now
sudo systemctl status redis-server --no-pager | head -8

# Test
redis-cli ping     # → PONG
```

Par défaut Redis écoute sur `127.0.0.1:6379` uniquement → OK pour notre usage (apps locales sur le VPS).

---

## 4. Préparer l'arborescence de déploiement

```bash
sudo mkdir -p /var/www/geoclicmedia/back /var/www/geoclicmedia/front
sudo chown -R ubuntu:ubuntu /var/www/geoclicmedia
ls -la /var/www/geoclicmedia/
```

---

## 5. Installer les outils Python pour la prod (à faire plus tard, ÉTAPE 6)

À ce stade pas besoin — on déploiera le code via `git pull` et un venv local au projet (`/var/www/geoclicmedia/back/.venv`).

Quand on y arrivera :

```bash
sudo apt install -y python3-venv python3-dev build-essential libpq-dev
```

---

## 6. Vérifier les ports utilisés

```bash
sudo ss -tlnp | grep -E ':(8001|8002|3001|5432|6379)\b'
```

Attendu :
- `5432` : postgres ✅
- `6379` : redis-server ✅
- `8001` : déjà occupé par autre app (on utilisera 8002 pour Django)
- `8002` : libre ✅
- `3001` : libre ✅

---

## 7. Donner-moi le DB_PASSWORD

Une fois tout installé, colle-moi :
1. La sortie de `psql ... SELECT version(), PostGIS_Version();` (vérification fonctionnelle).
2. Le `DB_PASSWORD` généré (je le mettrai dans `.env`).

⚠️ **Ne commit jamais le `.env` avec ce mot de passe**. Il est déjà dans `.gitignore`.
