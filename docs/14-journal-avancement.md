# 14 — Journal d'avancement

Historique des sessions de dev, décisions, blocages et fixes. **Tenu à jour à chaque grosse étape**.

---

## Sprint 1 — Fondations

**Démarré** : 2026-05-03
**Objectif** : PWA installable + back-office utilisable + déploiement prod sur `media.geoclic.fr`.

### ✅ ÉTAPE 1 — Init projet + déploiement de base (2026-05-03)

**Réalisations**
- Monorepo créé : `back/` (Django) + `front/` (Next.js, à venir) + `docs/`.
- Repo GitHub : https://github.com/fredco30/geoclicm-dia
- VPS OVH `135.125.159.142` (Ubuntu 25.04) : PostgreSQL 17.7 + PostGIS 3.5 + Redis installés.
- Base PG dédiée : `geoclicmedia_db` / user `geoclicmedia_user`.
- Django 5.1.15 + DRF 3.17.1 + drf-spectacular + Celery 5.6 + django-otp installés sur VPS.
- Custom User model (rôles reader/advertiser/editor/admin) migré.
- Superuser `fred` créé.
- Django runserver tourne dans `tmux session=django` sur port 8002.
- Admin accessible : http://135.125.159.142:8002/admin/

**Fichiers principaux créés**
- `.gitignore`, `.gitattributes`, `README.md`, `docs/14-journal-avancement.md`
- `back/manage.py`, `back/pyproject.toml`, `back/.env.example`
- `back/requirements/{base,dev,prod}.txt`
- `back/config/{settings/base.py, settings/dev.py, settings/prod.py, urls.py, wsgi.py, asgi.py, celery.py}`
- `back/apps/core/{models.py, admin.py, views.py, urls.py, apps.py}`
- `back/apps/core/migrations/0001_initial.py`
- `back/INSTALL_VPS.md` (procédure VPS)

**Décisions structurantes**
| Décision | Pour |
|---|---|
| **Monorepo** (back+front+docs ensemble) | Solo dev, déploiement scripté unique |
| **Sous-domaine `media.geoclic.fr`** vs domaine dédié | Cohabitation simple avec geoclic.fr |
| **Runtime 100% sur le VPS**, édition local Windows | PC éteignable, dev = prod, GDAL natif Linux |
| **`/var/www/geoclicmedia/`** | Cohérence avec apps existantes (`gestia.ovh`, `camping.geoclic.fr`) |
| **Ports** : Django 8002 (8001 occupé), Next.js 3001 | Pas de conflit avec apps existantes |
| **PostgreSQL 17** (au lieu de 16 prévu) | Default Ubuntu 25.04, rétro-compatible |
| **`django.contrib.gis` ré-activé** | GDAL trivial sur Linux, on profite de PostGIS dès Sprint 1 |

**Blocages rencontrés et fixes**
| Blocage | Cause | Fix |
|---|---|---|
| `pip install GDAL` échoue Windows | Pas de wheels GDAL Windows | Pivot dev sur VPS Linux (GDAL = `apt install gdal-bin`) |
| `git clone .` échoue : "destination not empty" | Dossiers `back/`/`front/` créés vides au préalable | `rmdir back front` puis re-cloner |
| `python3 -m venv` permission denied | Permissions perdues après `git clone` | `sudo chown -R ubuntu:ubuntu /var/www/geoclicmedia` |
| `pip install`: externally-managed-environment | PEP 668 sur Ubuntu 25.04 | Installer `python3.13-venv python3-full` puis utiliser le venv |
| `migrate` : "Dependency on app with no migrations: core" | Migration `0001_initial` jamais générée | `python manage.py makemigrations core` sur VPS, puis commit/push |
| `CREATE USER ... PASSWORD ''` (mdp vide) | Variable `$DB_PASSWORD` non définie dans la session shell | `ALTER USER geoclicmedia_user WITH PASSWORD '...'` après coup |

**État de validation**
- [x] `python manage.py check` OK
- [x] Migration `core.0001_initial` appliquée (User custom)
- [x] Connexion PG via mot de passe OK (test `psql`)
- [x] Redis répond `PONG`
- [x] Site accessible sur http://135.125.159.142:8002/admin/
- [x] Login superuser fonctionne
- [x] `tmux` détaché → Django survit à la déconnexion SSH

**Pivot identifié**
- Fred ne veut **pas** s'appuyer sur Django Admin pour la rédactrice. Tout passera par un **back-office custom dans le front Next.js** (cohérence UX, intégration éditeur markdown, upload images intégré).
- Conséquence : ÉTAPE 3 (DRF) doit gérer les endpoints **écriture** + auth + permissions par rôle. ÉTAPE 5 dédoublée en 5a (pages publiques) + 5b (back-office custom).
- Django Admin reste **minimal** (juste pour debug et seed côté Fred).

---

### ✅ ÉTAPE 2 — Modèles éditoriaux complets (2026-05-03)

**Réalisations**
- 5 nouveaux modèles : `Commune`, `Media` (core) + `Category`, `Tag`, `Article` (editorial).
- Champs anticipés sprints 2-4 : `facebook_*` (sprint 2 publication auto), `sponsor_data` + `sponsor_disclosure` (sprint 3-4), `meta_title` + `meta_description` (SEO), `view_count`.
- 3 indexes composites Article : (status, -published_at), (category, -published_at), (commune, -published_at).
- Pillow `apps/core/services/images.py` : redimensionnement auto WebP en 3 tailles (400/800/1600px) via signals post_save sur `Media`, `Commune.cover_image`, `Article.cover_image`.
- Fixtures seed chargées : 7 communes du territoire + 8 catégories éditoriales.
- Admin Django minimal fonctionnel (search, filters, prepopulated_fields, raw_id_fields, filter_horizontal, fieldsets repliés pour les sections anticipation).

**Blocages rencontrés et fixes**
| Blocage | Cause | Fix |
|---|---|---|
| `loaddata communes` : NotNullViolation sur `created_at` | `auto_now_add=True` est ignoré par loaddata (mode raw save) | Ajouter `created_at` + `updated_at` explicitement dans les fixtures JSON |

**État de validation**
- [x] Migrations Django Sprint 1 ÉTAPE 2 appliquées sans erreur (core 0002, editorial 0001)
- [x] 7 communes + 8 catégories visibles dans Django Admin
- [x] Articles, Catégories, Tags accessibles dans la section EDITORIAL de l'admin

**Reste à valider** (test manuel par Fred)
- [ ] Créer un article avec cover_image via admin → vérifier que `mediafiles/articles/2026/05/<nom>_thumbnail.webp`, `_medium.webp`, `_large.webp` sont bien générés.

---

### 🟡 ÉTAPE 3 — API REST DRF (en cours, démarrage 2026-05-03)

**À faire**
- Endpoints lecture publique : `GET /api/articles/`, `/api/articles/<slug>/`, `/api/categories/`, `/api/communes/`, `/api/tags/`, `/api/search/?q=`.
- Endpoints écriture pour back-office : `POST /api/articles/`, `PATCH /api/articles/<id>/`, `DELETE`, upload Media.
- Auth : DRF Token + cookie HttpOnly (compatible SSR Next.js).
- Permissions : reader = read-only, editor/admin = écriture, propriétaire-only sur édition.
- Filtres django-filter : par category, commune, tag, date, status, is_featured.
- Recherche full-text PostgreSQL via SearchVector + pg_trgm.
- Pagination : 20 articles/page.
- Cache HTTP 60s sur les listes publiques.
- Swagger auto-généré accessible sur `/api/schema/swagger-ui/`.

---

### ⏳ ÉTAPES suivantes prévues

| # | Étape | Estimation | Statut |
|---|---|---|---|
| 3 | API REST DRF (lecture + écriture, auth, permissions) | 2 j | À faire |
| 4 | Init Next.js + PWA + shadcn/ui | 1,5 j | À faire |
| 5a | Pages publiques (accueil, article, catégorie, recherche, légales) | 2 j | À faire |
| 5b | Back-office custom front (CRUD articles, login, éditeur, upload) | 2 j | À faire |
| 6 | Déploiement prod (Nginx + gunicorn + systemd + Let's Encrypt + backup) | 1,5 j | À faire |
| 7 | Polish (Lighthouse, PWA Android/iOS, doc rédactrice, sitemap) | 1 j | À faire |

---

## 📋 Conventions de tenue de ce journal

- **Une section par étape**, pas par jour.
- **Décisions structurantes** : seulement celles qu'on aurait du mal à reverser plus tard.
- **Blocages/fixes** : utile pour ne pas refaire les mêmes erreurs sur les sprints suivants.
- **Pas de secrets** ici (mots de passe, SECRET_KEY, tokens) — ce fichier est committé public-ready.
- **Mise à jour à la fin de chaque ÉTAPE validée**, pas en cours d'étape.
