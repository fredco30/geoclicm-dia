# geoclicMédia — back

Back-office Django + API REST publique du média local du littoral camarguais.

## Stack

- **Django 5.1** — admin + API
- **DRF 3.17** — API REST
- **drf-spectacular** — OpenAPI/Swagger auto
- **PostgreSQL 16 + PostGIS 3** — DB (PostGIS activé côté DB, backend Django passera de `postgresql` à `postgis` en Sprint 2)
- **Pillow 11** — redimensionnement images
- **Celery 5 + Redis** — tâches async (sprint 2 : publication Facebook auto)
- **django-otp** — 2FA admin
- **django-environ** — config via `.env`

## Démarrage rapide (dev local)

### Prérequis

- Python 3.12+ installé sur Windows (déjà OK : `py -3.12`)
- Accès SSH au VPS `135.125.159.142` (user `ubuntu`)
- PostgreSQL 16 + PostGIS installé sur le VPS (voir [INSTALL_VPS.md](INSTALL_VPS.md))

### Setup local

```powershell
cd back
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements/dev.txt
copy .env.example .env
# éditer .env : DB_PASSWORD à remplir une fois la DB créée sur le VPS
```

### Tunnel SSH vers le PG du VPS

Ouvrir un terminal dédié (à laisser tourner pendant le dev) :

```bash
ssh -L 5432:localhost:5432 ubuntu@135.125.159.142 -N
```

Le PG du VPS devient accessible localement sur `localhost:5432`. Django se connecte normalement via `.env`.

### Lancer le serveur dev

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Accès :
- Admin : http://localhost:8000/admin/
- API root : http://localhost:8000/api/
- Swagger : http://localhost:8000/api/schema/swagger-ui/
- Healthcheck : http://localhost:8000/healthz/

## Structure

```
back/
├── config/
│   ├── settings/
│   │   ├── base.py    # commun
│   │   ├── dev.py     # DEBUG=True, BrowsableAPI, email console
│   │   └── prod.py    # HTTPS forcé, Whitenoise, Sentry
│   ├── urls.py        # routes racine
│   ├── wsgi.py        # gunicorn (prod)
│   ├── asgi.py
│   └── celery.py      # config Celery
├── apps/
│   └── core/          # User custom + endpoints communs
│       ├── models.py
│       ├── admin.py
│       ├── views.py
│       └── urls.py
├── requirements/
│   ├── base.txt       # commun
│   ├── dev.txt        # +pytest, ruff, ipython
│   └── prod.txt       # +gunicorn, whitenoise, sentry
├── manage.py
├── pyproject.toml     # config Black + Ruff + pytest
├── .env.example       # template
└── README.md
```

## Ports

| Composant | Port dev | Port prod |
|---|---|---|
| Django | 8000 | 8002 (8001 occupé par autre app sur VPS) |
| Next.js | 3001 | 3001 |
| PostgreSQL | 5432 (tunnel SSH) | 5432 (local VPS) |
| Redis | 6379 | 6379 |

## Conventions

- **Black** : `black .` (line-length 100)
- **Ruff** : `ruff check . --fix` puis `ruff format .`
- **Type hints** sur les services et fonctions publiques
- **Migrations** : un commit = une migration cohérente, jamais squashées sans raison
- **Commits** : format `<scope>: <verbe à l'infinitif>`, ex : `core: add User.role field`

## Workflow dev (édit local Windows, runtime VPS)

```
Windows                             VPS OVH 135.125.159.142
───────                             ────────────────────────
1. Édite le code (VS Code)
2. git push GitHub          ──────► 3. cd /var/www/geoclicmedia/back && git pull
                                    4. .venv/bin/python manage.py migrate
                                    5. (runserver tourne dans tmux, ou systemd)
                                    6. Site live 24/7
```

Le PC peut être éteint, le site reste accessible.

## Sprint 1 — notes

- Runtime 100% sur le VPS (GDAL/PostGIS dispos, dev = prod).
- Pas de tests automatisés exhaustifs : juste la couverture des endpoints publics.
- Pas de pre-commit hooks (sprint 1 = lean).
