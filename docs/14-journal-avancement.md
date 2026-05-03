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

### ✅ ÉTAPE 3 — API REST DRF (2026-05-03)

**Réalisations**
- Sérialiseurs DRF 3 niveaux : `ArticleListSerializer`, `ArticleDetailSerializer`, `ArticleWriteSerializer`. Plus `CommuneSerializer`, `MediaSerializer`, `CategorySerializer`, `TagSerializer`, `AuthorSerializer`.
- `ImageVariantsField` custom : retourne `{thumbnail, medium, large, original}` pour chaque image.
- Endpoints lecture publique (anon, sans auth) :
  - `GET /api/articles/?category=&commune=&tag=&department=&article_type=&is_featured=&published_after=&published_before=`
  - `GET /api/articles/<slug>/` (incrémente view_count anon)
  - `GET /api/categories/`, `/api/communes/`, `/api/tags/` (sans pagination)
  - `GET /api/search/?q=...` — full-text PG via `SearchVector("title"=A, "chapeau"=B, "body"=C, config="french")`.
- Auth back-office (Session Django, cookie HttpOnly, CSRF protégé) :
  - `GET /api/auth/csrf/` → pose csrftoken
  - `POST /api/auth/login/` → session
  - `POST /api/auth/logout/`
  - `GET /api/auth/me/` → profil + can_publish + role
- Permissions custom : `IsEditorOrAdmin` (lecture libre, écriture role-gated) + `IsAuthorOrReadOnly` (objet-level, admin bypass).
- Filtres django-filter : `ArticleFilter` avec slugs au lieu d'IDs (plus parlant côté URL).
- Cache `cache_page(60)` sur le viewset de recherche.
- Swagger auto-généré sur `/api/schema/swagger-ui/`.

**Anticipation** : passage en service systemd `geoclicmedia-django.service` (au lieu de tmux/runserver foreground). Anticipe ÉTAPE 6, libère Fred du tmux.

**Service systemd** (à remplacer par gunicorn ÉTAPE 6) :
- WorkingDirectory : `/var/www/geoclicmedia/back`
- ExecStart : `.venv/bin/python manage.py runserver 0.0.0.0:8002`
- Restart : on-failure
- Logs : `/var/log/geoclicmedia-django.log`
- Commande de redéploiement code : `cd /var/www/geoclicmedia && git pull && sudo systemctl restart geoclicmedia-django`

**État de validation**
- [x] Service systemd `active (running)`
- [x] `/api/categories/` retourne 8 catégories en JSON
- [x] `/api/articles/` retourne l'article test publié
- [x] Swagger UI accessible sur `/api/schema/swagger-ui/`

---

### ✅ ÉTAPE 4 — Init Next.js 16 + PWA (2026-05-03)

**Réalisations**
- `create-next-app` Next.js **16.2.4** (et non 15) + React 19 + Tailwind 4 + TypeScript strict + App Router + src dir.
- @ducanh2912/next-pwa 10.2.9, lucide-react, react-markdown + remark-gfm installés.
- next.config.ts : PWA configurée (dest: public, register, cacheOnFrontEndNav, disable en dev).
- Manifest PWA via `app/manifest.ts` (theme #1a4d6e, lang fr, 3 icônes).
- Icônes PWA générées via Pillow (gradient + lettre "g") : 192, 512, maskable, apple-touch.
- Layout racine + Header (nav mobile-first) + Footer (rubriques + territoire + légal).
- Page d'accueil avec hero (pattern letterbox + blur background pour préserver toutes orientations photo) + chips catégories cliquables + grille derniers articles.
- Composants ArticleCard, CategoryBadge.
- Client API typé `lib/api.ts` (apiGet ISR-aware, apiFetch auth, auth.{login,logout,me}).
- Types TS miroirs des serializers DRF (`types/api.ts`).
- Service systemd `geoclicmedia-next.service` sur port 3001.

**Adaptations Next 16 (breaking 15→16)**
- `params` et `searchParams` sont `Promise` — toujours `await`.
- `cookies()` et `headers()` async — toujours `await`.
- Turbopack par défaut en dev, **build forcé en `--webpack`** car next-pwa injecte une config webpack incompatible Turbopack.
- `fetch` n'est plus cached par défaut → ISR explicite via `{ next: { revalidate } }`.

**Blocages rencontrés et fixes**
| Blocage | Cause | Fix |
|---|---|---|
| Build webpack/turbopack mix-up | next-pwa injecte webpack, Next 16 par défaut Turbopack | Script build = `next build --webpack` |
| `Facebook` icon import error lucide-react 1.14 | Icônes de marques retirées (licence) | Remplacer par `Share2` + `MessageSquare` + label texte |
| Build VPS lent silencieux | Webpack + 7.6Gi RAM modeste | `NODE_OPTIONS=--max-old-space-size=4096` + patience |

---

### ✅ ÉTAPE 5a — Pages publiques (2026-05-03)

**Réalisations**
- `/articles/[slug]` : détail ISR 1h, generateMetadata avec OG + Twitter card + auteur + publishedTime + image, breadcrumb, badge cat, commune, chapeau, cover orientation préservée (max-h 600), ArticleBody markdown stylé (h1-h3, p, a, ul, ol, blockquote, img, code, pre), tags, ShareButtons.
- `/categories/[slug]` : listing paginé ISR 10min, header coloré (chip catégorie + description).
- `/communes/[slug]` : listing paginé par commune (INSEE, département, intercommunalité).
- `/recherche?q=...` : page dynamique force-dynamic, formulaire GET, full-text PostgreSQL.
- 5 pages légales : /mentions-legales, /politique-confidentialite (RGPD + Meta), /cgu, /contact, /suppression-donnees (URL obligatoire pour Meta App Review).
- Composants : ArticleBody (markdown styling sans @tailwindcss/typography), ShareButtons (FB+WA+copy, client component), Pagination (ellipsis ±2 autour current), LegalPage (layout commun).

**Blocages rencontrés et fixes**
| Blocage | Cause | Fix |
|---|---|---|
| Images invisibles côté front | URLs relatives (`/media/...`) interprétées sur port front 3001 | `ImageVariantsField` retourne URLs absolues via `request.build_absolute_uri` |
| `MEDIA_URL=http://...` cassait static | `static()` Django attend URL relative pour la route dev | Revert à `MEDIA_URL=/media/`, NEXT_PUBLIC_API_URL fait que Next fetch via IP publique → Django build URLs avec ce host |
| Cover article massive en hauteur | aspect-[16/9] forcé + photo portrait → crop massif | Page article : pas d'aspect ratio, max-h-[600px] + w-auto + mx-auto (préserve orientation). Hero accueil : pattern letterbox + blur (background image cover blurred + foreground image contain). |
| Filtre catégorie ne fonctionne pas | `filter_backends = (OrderingFilter,)` écrasait DEFAULT_FILTER_BACKENDS | Override explicite : `filter_backends = (DjangoFilterBackend, OrderingFilter)` |
| Tous les chips catégorie d'accueil cliquaient sur le même article | `after:absolute after:inset-0` du Link dans ArticleCard se positionnait par rapport au plus proche `relative`, qui était trop haut → couvrait toute la viewport | Ajouter `relative` à `<article>` parent dans ArticleCard |

---

### ✅ ÉTAPE Bonus — Seed 4 articles avec covers générées (2026-05-04)

**Réalisations**
- Management command `python manage.py seed_articles [--force]`.
- Génère 4 articles éditoriaux variés :
  - "Les saliniers d'Aigues-Mortes racontent leurs étés de braise" (Mémoire vivante / Aigues-Mortes / portrait)
  - "La Grande-Motte célèbre 50 ans d'architecture pyramidale" (Patrimoine / La Grande-Motte / dossier / **is_featured=True**)
  - "Une nuit avec les chalutiers du Grau-du-Roi" (Pêche et traditions / Le Grau-du-Roi / reportage)
  - "Marc, gardian de la dernière manade traditionnelle de Petite Camargue" (Portraits / Vauvert / portrait)
- Cover images générées via Pillow : gradient diagonal aux couleurs de la catégorie + titre wrap blanc avec ombre.
- Tags créés à la volée (sel, tradition, agriculture, climat, architecture, Balladur, pêche, chalutier, gardian, manade, etc.).
- Signal post_save génère les 3 versions WebP automatiquement.

---

### ✅ ÉTAPE 5b — Back-office custom front (2026-05-04 nuit)

**Réalisations Backend**
- `MediaViewSet` (POST /api/media/) : upload multipart, auth editor/admin requise, signal post_save génère 3 versions WebP.
- `ArticleListSerializer` enrichi avec `status` + `updated_at` pour dashboard.
- `ArticleFilter` accepte `?status=draft|scheduled|published|archived`.
- `CSRF_TRUSTED_ORIGINS` configuré dev (localhost:3001 + IP publique:3001) et prod (media.geoclic.fr).

**Réalisations Frontend**
- Composants UI : `Button`, `Input`, `Textarea`, `Label`, `Select` (Tailwind, sans dépendance shadcn).
- Helpers auth server : `getCurrentUser()`, `getCookieHeader()` (cookies forwardés vers Django).
- Layouts : `/admin/layout.tsx` (root, dynamic, robots noindex) + `/admin/(protected)/layout.tsx` (auth check + sidebar).
- Pages :
  - `/admin/login` — formulaire login + redirect vers /admin si déjà connecté.
  - `/admin` — dashboard avec table de tous les articles (drafts + publiés + archivés), badge status coloré, actions Voir/Éditer.
  - `/admin/articles/new` — création nouvel article.
  - `/admin/articles/[slug]/edit` — édition avec data fetched côté serveur (cookie auth).
- Composants admin :
  - `LoginForm` (client component, gestion CSRF auto).
  - `LogoutButton` (client component).
  - `ArticleForm` (création + édition unifiés, sticky header, sidebar paramètres, sponsor disclosure, SEO meta).
  - `MarkdownEditor` (tabs Édition/Aperçu, lien vers cheat sheet, rendu live identique au rendu public).
  - `ImageUploader` (preview, retirer image, accepte image/*).

**Pattern auth utilisé**
- Session Django (cookie HttpOnly `sessionid`) + CSRF (cookie `csrftoken`).
- Front Next.js : `apiFetch` avec `credentials: 'include'` + header `X-CSRFToken` extrait du cookie.
- Layout protégé fait un `fetch /api/auth/me/` avec `Cookie:` header forwardé → redirect vers /admin/login si null ou pas can_publish.

---

### 🟡 ÉTAPE 6 — Préparation déploiement prod (fichiers prêts, 2026-05-04 nuit)

**Fichiers prêts dans `deploy/`**
- `geoclicmedia-django.service` — gunicorn 3 workers + 2 threads, hardening systemd (NoNewPrivileges, ProtectSystem, PrivateTmp).
- `geoclicmedia-celery-worker.service` — Celery worker 2 concurrency.
- `geoclicmedia-celery-beat.service` — Celery beat avec DatabaseScheduler.
- `nginx-media.geoclic.fr.conf` — vhost HTTPS + HSTS + security headers + reverse proxy Django/Next + cache static + media servis directement par Nginx.
- `backup-pg.sh` — script bash backup quotidien PG → /var/backups/geoclicmedia/, rétention 14 jours, compressé .sql.gz.
- `deploy-prod.sh` — script d'installation complet (systemd + Nginx + Let's Encrypt + cron backup) idempotent.

**À lancer manuellement par Fred** (une seule fois) :
```bash
sudo bash /var/www/geoclicmedia/deploy/deploy-prod.sh
```

**Pré-requis avant ce script** :
- DNS `media.geoclic.fr` → `135.125.159.142` (configuré chez OVH ?)
- Service `geoclicmedia-next` actif (déjà OK)
- Build front à jour (`npm run build` dans `front/`)
- Email contact valide dans le script (modifiable)

---

## Récap final Sprint 1

| Étape | Statut | Anticipations |
|---|---|---|
| 1 — Fondations | ✅ | systemd Django dès Sprint 1 ÉTAPE 3 |
| 2 — Modèles + Pillow | ✅ | Champs FB/sponsor anticipés |
| 3 — API DRF + auth | ✅ | Endpoints écriture + perms par rôle |
| 4 — Next.js + PWA + déploiement | ✅ | Service systemd Next.js |
| 5a — Pages publiques | ✅ | OG/Twitter cards, ISR, full-text search |
| 5b — Back-office custom | ✅ | Markdown editor + upload images |
| 6 — Déploiement prod final | 🟡 | Tout prêt, juste à lancer le script |
| 7 — Polish | ⏳ | Lighthouse, doc rédactrice, sitemap |

**Au-dessus du brief initial** :
- Service systemd dès Sprint 1 (au lieu de tmux puis ÉTAPE 6).
- Script de déploiement automatisé idempotent.
- 4 articles seed avec covers générées (le brief en demandait 3-4).
- Pattern letterbox + blur pour gérer toutes orientations photos.

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
