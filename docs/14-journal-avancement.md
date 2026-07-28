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
| 7 — Polish | 🟡 en cours | Lighthouse, doc rédactrice, sitemap, monitoring |

**Au-dessus du brief initial** :
- Service systemd dès Sprint 1 (au lieu de tmux puis ÉTAPE 6).
- Script de déploiement automatisé idempotent.
- 4 articles seed avec covers générées (le brief en demandait 3-4).
- Pattern letterbox + blur pour gérer toutes orientations photos.
- Refonte route groups (site)/admin/ pour séparer layouts publics/admin.
- Page gestion comptes utilisateurs custom (anticipation Sprint 2).

---

### ✅ ÉTAPE 6 — Déploiement prod final (2026-05-04 matin)

**Réalisations**
- gunicorn 3 workers + 2 threads + hardening systemd installé en remplacement du `runserver` dev.
- Services Celery worker + beat actifs (prêts pour Sprint 2 publication FB auto).
- Vhost Nginx `media.geoclic.fr` : HTTPS + HSTS + security headers + reverse proxy.
- **Let's Encrypt** : certificat émis et installé, auto-renew configuré (expire 2026-08-02).
- DNS configuré chez **Hostinger** (registre du domaine `geoclic.fr`) — enregistrement A `media` → `135.125.159.142`.
- Backup PostgreSQL quotidien (cron 3h00, rétention 14 jours).
- Settings prod : SECURE_SSL_REDIRECT, HSTS 30j, CSRF_TRUSTED_ORIGINS = `https://media.geoclic.fr`.
- Refonte route groups front : `(site)` pour pages publiques avec Header/Footer, `/admin/*` indépendant (pas de Header public parasite).
- **Django Admin déplacé sur `/django-admin/`** pour libérer `/admin/*` au back-office custom.
- Page gestion comptes `/admin/settings/users` (anticipation Sprint 2) : CRUD users avec rôles + désactivation + protection self-delete.
- Affichage rôle "Administrateur" si is_superuser via helper `getRoleLabel`.

**Blocages rencontrés et fixes**
| Blocage | Cause | Fix |
|---|---|---|
| `deploy-prod.sh` collectstatic FileNotFoundError | LOGGING prod pointait sur sous-dossier inexistant | LOGGING via stdout → systemd journald |
| Certbot timeout sur acme | DNS pas encore propagé (Hostinger registre, OVH host) | Configurer A record `media` chez Hostinger, attendre 5 min, retry |
| HTTPS cassé après re-deploy nginx config | `cp deploy/nginx-*.conf` écrasait les `ssl_certificate` injectés par certbot | `sudo certbot --nginx --reinstall` + warning ajouté en tête du fichier deploy |
| Conflit routes `/admin/*` Django vs Next.js custom | Vhost Nginx envoyait tout `/admin/*` à Django | Django Admin déplacé sur `/django-admin/`, vhost regex updated |
| Front cherchait articles sur HTTP au lieu de HTTPS | `.env.local` avait gardé `http://135.125.159.142:8002` | Réécrire `.env.local` avec heredoc + rebuild Next |

---

### ✅ ÉTAPE 7 — Polish + direction artistique (2026-05-04)

**Réalisations SEO / accessibilité**
- `app/sitemap.ts` : sitemap dynamique avec toutes URLs publiques + articles + catégories + communes, ISR 1h, priorités cohérentes (1.0 home, 0.9 featured, 0.7 articles).
- `app/robots.ts` : disallow `/admin/`, `/django-admin/`, `/api/`.
- Skip link "Aller au contenu" pour navigation clavier (a11y).

**Documentation utilisateur**
- `docs/15-administration-utilisateurs.md` : 4 rôles, création comptes Django+CLI, désactivation RGPD, sécurité, roadmap.
- `docs/16-guide-redactrice.md` : tutoriel complet pour la rédactrice (login, markdown, cover image, catégorisation, SEO, bonnes pratiques).
- `docs/17-monitoring.md` : UptimeRobot setup, logs systemd/nginx, diagnostic panne, backup PG, renouvellement HTTPS, checklist hebdo.

**Phase 1 design — direction "magazine littéraire ancré local"**
- Polices : **Fraunces** (serif éditorial pour titres + chapeaux italiques) + **Inter** (sans-serif UI).
- Palette enrichie : `#fbf9f5` (sel, fond pages publiques), `#e8dfd1` (sable, future section secondaire), `#a8533a` (terre cuite, accent rare réservé à la pub commerçants).
- CategoryBadge "tampon discret" : bordure 1.5px + texte couleur + fond off-white.
- Page article : `max-w-[68ch]` (optimum lecture Bringhurst), titre Fraunces semibold, chapeau italique serif desktop.
- **Lettrine** sur 1er paragraphe du corps article (4.5rem Fraunces, couleur camargue, float-left).
- ArticleCard premium : hover -translate-y-0.5 + shadow-xl + scale image 1.04 (transitions 300-500ms).
- Hero accueil : titre serif 6xl drop-shadow.
- Header/Footer/h2 "Derniers articles" : font-serif pour cohérence de marque.
- Sélection texte (`::selection`) aux couleurs marque.

**Adaptation mobile-first**
- Hero **2 layouts** : mobile = image edge-to-edge + texte sur fond slate-900 dessous (lisibilité max), desktop = letterbox+blur+surimpression (effet magazine).
- Chips catégories : **scroll horizontal** mobile (overflow-x-auto edge-to-edge), wrap classique desktop.
- Typo réduite mobile : titre h1 article 2xl (vs 3xl desktop), chapeau text-base sans italique (vs serif italic xl desktop).
- ArticleCard : padding 4 mobile / 5 desktop, titre text-lg / text-xl.
- **Drawer mobile** fonctionnel avec 9 rubriques + 7 communes + recherche + légal, fermeture Échap/clic backdrop/clic lien, scroll body bloqué.
  - Bug fix `createPortal(drawer, document.body)` pour échapper au stacking context du header (backdrop-blur créait un nouveau context qui contraignait le z-index du drawer).

**Restant à faire manuellement par Fred (one-time)**
- Soumettre `https://media.geoclic.fr/sitemap.xml` à Google Search Console.
- Configurer 2 monitors UptimeRobot (`/` et `/healthz/` keyword "ok").
- Partager le guide rédactrice à sa partenaire.
- Tester PWA installation Android Chrome + iOS Safari sur vrais devices.

---

## 🎉 Sprint 1 = LIVRÉ — production live sur https://media.geoclic.fr

**Bilan vs brief initial** :
- ✅ PWA installable
- ✅ Back-office utilisable (custom Next.js, pas Django Admin)
- ✅ Site déployé en production (HTTPS Let's Encrypt)
- ✅ Pipeline `git push → prod` opérationnel
- ✅ 5 articles publiés (1 manuel + 4 seed) avec covers
- ✅ Monitoring + backups quotidiens + doc

**Anticipations Sprint 2-4 déjà en place** :
- Champs `facebook_*` (publication auto FB sprint 2)
- Champs `sponsor_data` + `sponsor_disclosure` (régie pub sprint 3-4)
- Page gestion comptes utilisateurs custom (était sprint 2 dans le brief)
- Couleur terre cuite `#a8533a` réservée comme accent commercial

---

---

## Sprint 3+4 — Régie publicitaire + self-service Stripe (fusionnés)

**Démarré** : 2026-05-04
**Livré (5 lots sur 6)** : 2026-05-05
**Objectif** : monétisation commerçants — annuaire + régie pub + self-service Stripe.

**Décision structurante de cadrage** : Sprint 3 (régie manuelle) et Sprint 4 (self-service Stripe) **fusionnés en un seul sprint long**. Raison : éviter les migrations a posteriori sur `Business` (champs Stripe ajoutés post-migration = pénible), ne pas refaire le back-office annonceur en deux fois, capitaliser le contexte Sprint 1 chargé.

### ✅ Lot A4 — Modèles + back-office admin annonceur (2026-05-04)

**Réalisations**
- Apps `directory` (`Business`, `BusinessCategory` hiérarchique) et `ads` (`AdCampaign`).
- 44 catégories seed via management command (8 racines + 36 sous-catégories), icônes Lucide + types schema.org (`Restaurant`, `Hotel`, `Bakery`, etc.).
- Multi-communes : `Business.commune` FK siège + `Business.service_areas` M2M zones desservies (artisans multi-communes).
- API DRF `/api/businesses/` + `/api/business-categories/` avec filtres + permissions `IsEditorOrAdmin`.
- Back-office Next.js sous `/admin/directory/` : liste + create + edit avec tous les champs (Stripe inclus mais vides), upload logo + cover_image, filtres composables.
- Éditeurs visuels horaires hebdomadaires (créneaux multiples par jour, raccourci « copier lundi sur Mar–Ven ») + fermetures saisonnières (date pickers + raison).
- Geocoding adresse → lat/lng via Nominatim (call direct navigateur, OK pour saisie manuelle).
- Migration `Article.sponsor_data` (JSONField legacy) → FK `Article.sponsor` vers `directory.Business`.

### ✅ Lot B — Affichage public commerçants (2026-05-04)

**Réalisations**
- `/commerces` annuaire filtrable (catégories racines + communes en chips), pagination 20/page.
- `/commerces/[slug]` fiche détaillée : description, spécialités, horaires hebdo, fermetures, contact, mini-carte MapLibre, badge « ★ Partenaire » terre cuite si plan = premium.
- **Carte d'ensemble MapLibre** sur `/commerces` avec markers cliquables (popup + lien fiche), `fitBounds` automatique sur l'ensemble.
- **Mini-carte fiche** + 3 boutons navigation (**Itinéraire Google Maps**, **Waze**, **Street View**) — pattern emprunté à `geoclic_services/InterventionDetailView.vue` phase 45 (GéoClic Suite).
- Encarts « Commerces partenaires » sur home (filtre `is_featured=true`) + page commune `/communes/[slug]` (filtre `area=slug` qui matche commune-siège OU service_areas).
- Badge « Sponsorisé » terre cuite + encart « En partenariat avec » CTA fiche en fin d'article (`Article.sponsor` FK exposé via `SponsorMini`/`SponsorDetail` serializers).
- Sélecteur sponsor dans le formulaire article admin Next.js.
- JSON-LD schema.org `LocalBusiness` (type dérivé de `category.schema_type`) sur fiche pour SEO local Google : address, geo, opening_hours, sameAs, servesCuisine pour Restaurant.
- Lien header desktop + drawer mobile vers `/commerces`.

### ✅ Lot C — Régie publicitaire (2026-05-04)

**Réalisations**
- App `ads` : modèle `AdCampaign` avec 8 placements (`home_hero`, `home_sidebar`, `article_inline/sidebar`, `directory_top/inline`, `agenda_top`, `newsletter`).
- Ciblage M2M `target_communes` + `target_categories` (vides = tous).
- API `GET /api/ads/serve/?placement=X&commune=Y&category=Z` : sert UNE campagne active à la date courante, choix random si plusieurs candidates, **incrémente `impression_count` atomiquement** (F-expression), 204 No Content si aucune match.
- Redirect tracker `GET /r/<id>/` : incrémente `click_count` puis 302 vers `target_url`.
- Composant front `<AdSlot placement="..." />` (Client) avec `cache: no-store` (rotation aléatoire à chaque visite), mention « Publicité » conforme ARPP, `rel="noopener sponsored"`.
- Intégrations placements : home_sidebar (entre articles et commerces partenaires), article_inline (fin d'article ciblé commune+catégorie), directory_top (sous filtres ciblage searchParams).
- Back-office admin custom `/admin/ads/campaigns/` avec 7 fieldsets (Identité, Emplacement, Créa, Ciblage, Période, Budget, Statut), stats CTR par campagne, badge statut intelligent (Désactivée / À venir / Diffusée / Terminée).

### ✅ Lot D — Espace annonceur self-service (2026-05-05)

**Réalisations**
- Auth self-service : `POST /api/auth/register-advertiser/` (email + password + nom/prénom, login auto), `/advertiser/register` + `/advertiser/login` publiques.
- Layout `/advertiser/(protected)/` avec sidebar dédiée (Tableau / Mes fiches / Mes campagnes / Abonnement), branding pastille terre cuite.
- Permissions custom : `IsAdvertiserOrTeam` + `IsBusinessOwnerOrTeam` / `IsCampaignOwnerOrTeam` (object-level via `business.owner == user`).
- ViewSets dédiés `/api/advertiser/businesses/` + `/api/advertiser/ad-campaigns/` avec `get_queryset` filtré par `owner=user` (sauf editor/admin) et `perform_create` qui force `owner=user` + `is_published=False` / `is_active=False` (workflow validation par équipe avant diffusion publique).
- Serializers restreints `BusinessAdvertiserWriteSerializer` / `AdCampaignAdvertiserWriteSerializer` qui excluent les champs admin-only (workflow, plan, ciblage, budget, owner).
- **Pas de duplication de code form** : `BusinessForm` et `AdCampaignForm` refactorisés avec prop `mode: "admin" | "advertiser"` qui adapte API base, URLs, fieldsets cachés, message de workflow.
- Pages `/advertiser/(protected)/fiches/...` + `/advertiser/(protected)/campagnes/...` : liste + create + edit avec garde-fou (pas de campagne sans fiche).
- Dashboard de bienvenue avec 2 cartes amorces cliquables.

### ✅ Lot E — Stripe + abonnements (TEST) (2026-05-05)

**Réalisations**
- `dj-stripe` 2.10 + `stripe` SDK installés.
- App `advertisers` : `Subscription` (wrapper métier autour de djstripe.Subscription) + `Invoice` (numérotation continue annuelle `YYYY-NNNN` pour conformité fiscale FR), HT/TVA(20)/TTC.
- Webhook handlers via `djstripe.signals.WEBHOOK_SIGNALS` :
  - `customer.subscription.created/updated` → upsert Subscription métier + sync `Business.plan`/`plan_starts_at`/`plan_ends_at`/`stripe_*` si subscription active.
  - `customer.subscription.deleted` → retour `Business.plan = free`.
  - `invoice.paid` → création Invoice métier idempotente avec numérotation continue.
  - `invoice.payment_failed` → Subscription `past_due`.
- Mapping `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_PREMIUM` → plans métier.
- Liaison Business ↔ Stripe Customer via `customer.metadata.business_id` posé au Checkout.
- API `POST /api/advertiser/checkout/` : crée/réutilise Customer, crée Checkout Session subscription (locale FR, billing address required), retourne URL hosted Stripe.
- API `POST /api/advertiser/portal/` : Customer Portal Session (gestion CB, factures, annulation).
- Page publique `/tarifs` : 3 cards Free/Basic/Premium comparées avec features détaillées, badge phase pilote « tous gratuits été 2026 ».
- Page `/advertiser/abonnement` : plan actuel + CheckoutButton (Basic/Premium) ou PortalButton selon état.
- **Mode TEST par défaut** (`STRIPE_LIVE_MODE=False`), bascule LIVE = un flag d'env + clés `sk_live_*` au lancement Pâques 2027.

### ⏸️ Lot F — Repoussé à plus tard (par décision Fred 2026-05-05)

Factures PDF ReportLab (modèle `Invoice.pdf_file` déjà en place côté model), emails Brevo (bienvenue, paiements, renouvellements), export CSV prospects. Non bloquant pour la phase pilote 2026 — Customer Portal Stripe gère déjà les factures Stripe nativement.

### Décisions structurantes Sprint 3+4

| Décision | Pour |
|---|---|
| **Sprint 3+4 fusionnés** | Éviter migrations Business a posteriori, capitaliser contexte chargé |
| **MapLibre GL JS + tuiles raster OSM** (pas de MapTiler) | Cohérence avec GéoClic Suite, pas de clé API à gérer, indépendance fournisseur |
| **dj-stripe** plutôt qu'intégration Stripe maison | Sync DB ↔ Stripe fiable, gestion webhooks complète |
| **Pas de claim de fiche** | Wizard from scratch ; pour pilotes été 2026, fiches admin avec `owner=null` puis transfert manuel |
| **Stripe TEST jusqu'à Pâques 2027** | Phase pilote gratuite, pipeline complet testable, bascule LIVE = un flag d'env |
| **Workflow PR-par-lot** (Git) | Push direct main bloqué par sandbox Claude Code en auto mode → branche dédiée + `gh pr create` à chaque lot |
| **Pattern boutons navigation Maps/Waze/Street View** emprunté à GéoClic Suite | Réutilisation éprouvée (`geoclic_services/InterventionDetailView.vue` phase 45) + ajout Waze |
| **Form mode `admin` / `advertiser`** via prop, pas de duplication | Maintenir 700+ lignes de form mutualisées (BusinessForm, AdCampaignForm) |

### Blocages rencontrés et fixes

| Blocage | Cause | Fix |
|---|---|---|
| Push direct main bloqué par Claude Code sandbox en auto mode | Politique built-in « Git Push to Default Branch » même avec `Bash(git push:*)` autorisé | Workflow PR par lot : branche dédiée + PR via `gh pr create` (ou lien GitHub à cliquer) |
| Conflits fichiers migration untracked sur VPS à chaque pull | `makemigrations` exécuté sur VPS (GDAL absent local Windows) génère des fichiers que Git refuse d'écraser au pull suivant | `rm` du fichier untracked + `git pull` (le repo a la même version après rapatriement via PR `chore(migrations)`) |
| `Facebook` / `Instagram` icons Lucide retirées | Licence brand assets retirée des Lucide récents | Remplacer par texte simple cliquable (Facebook / Instagram) ou `Share2` générique |
| `from djstripe import webhooks` ImportError | dj-stripe 2.10 a retiré le module `webhooks` (présent en 2.7) | Migration vers `djstripe.signals.WEBHOOK_SIGNALS` + `@receiver(WEBHOOK_SIGNALS["event.type"])`, signature `(sender, event, **kwargs)` |
| Trop de redirections `/advertiser` constatées sur PC Fred | État navigateur local (cache, cookies résiduels du compte admin avec session multiple) | Test sur téléphone OK = code OK, problème PC isolé (pas de bug code à fixer) |
| `pk_test` collée dans le chat | Réflexe utilisateur de copier la clé visible | OK pour `pk_*` (publique) ; pour `sk_*` (secrète) règle stricte « jamais dans le chat » + rotation immédiate via dashboard Stripe |

### État de validation

- [x] Tous les lots A4/B/C/D/E mergés sur `main`
- [x] Déployé en prod sur https://media.geoclic.fr (sauf migrations Stripe finales)
- [x] Annuaire `/commerces` accessible publiquement avec carte
- [x] `/admin/directory/businesses/` fonctionnel pour saisie pilotes
- [x] `/admin/ads/campaigns/` fonctionnel pour création campagnes
- [x] `/advertiser/register` + dashboard self-service accessibles
- [x] `/tarifs` page publique en ligne
- [ ] Stripe configuré côté Fred (compte test, 2 produits, webhook, Customer Portal) — **en cours 2026-05-05**
- [ ] Test end-to-end paiement (carte `4242 4242 4242 4242`) — bloqué par config Stripe

### Reste à faire manuellement par Fred

- Finaliser config Stripe (compte → clés → 2 produits → webhook → Customer Portal → `.env` VPS).
- Démarcher 10-15 commerçants pilotes pour la saison été 2026 (création des fiches en admin avec `owner=null` puis transfert quand le commerçant s'inscrit).
- Lancement commercial Pâques 2027 : bascule `STRIPE_LIVE_MODE=True` + clés `sk_live_*`.

---

## 🎉 Récap final Sprint 3+4

**Plateforme fonctionnellement prête pour la phase pilote été 2026** : démarchage commerçants → inscription self-service → fiche annuaire publique avec carte + navigation → encarts publicitaires ciblés → abonnements Stripe (test pour le pilote, prod au lancement commercial).

**Au-dessus du brief initial** :
- Multi-communes (`service_areas` M2M) — non spécifié au brief, identifié par Fred lors d'un test plombier multi-communes.
- Boutons navigation Maps/Waze/Street View sur fiche commerçant — pattern repris de GéoClic Suite, gros plus UX.
- Carte d'ensemble MapLibre sur l'annuaire public — au-delà de la simple mini-carte de fiche.
- JSON-LD schema.org pour SEO local Google.
- Refactor mode `admin` / `advertiser` dans BusinessForm + AdCampaignForm (pas de duplication 700+ lignes).
- Numérotation continue Invoice (exigence fiscale FR) prête dès maintenant pour conformité 2027.

---

## ➡️ Prochaine étape

**Test end-to-end Stripe** une fois config terminée par Fred (carte `4242 4242 4242 4242` → vérifier que `Business.plan` passe à `basic`/`premium` automatiquement via webhook + qu'une `Invoice` métier est créée).

Si OK, le projet entre en **mode maintenance / phase pilote** : pas de gros lot dev avant le démarrage commercial 2027 (où on pourra activer Lot F = factures PDF + emails Brevo + export CSV prospects).

---

## 📋 Conventions de tenue de ce journal

- **Une section par étape**, pas par jour.
- **Décisions structurantes** : seulement celles qu'on aurait du mal à reverser plus tard.
- **Blocages/fixes** : utile pour ne pas refaire les mêmes erreurs sur les sprints suivants.
- **Pas de secrets** ici (mots de passe, SECRET_KEY, tokens) — ce fichier est committé public-ready.
- **Mise à jour à la fin de chaque ÉTAPE validée**, pas en cours d'étape.

---

## Agenda, Marchés, Découvrir et collecte officielle — juillet 2026

**Lots mergés et déployés** : PR `#68` à `#73`
**État de production vérifié** : 28 juillet 2026
**Commit production** : `7319f4080b91da73a692135c9cd3dbb800e8d45d`

### Fonctionnalités livrées

- Agenda complet : catégories, événements, occurrences explicites, CRUD admin,
  filtres publics, détail, carte et export ICS.
- Marchés composés depuis les événements `kind=market` et les commerces marqués
  `is_local_producer`.
- Découvrir : catégories, lieux, relations éditoriales, CRUD et pages publiques.
- Sources Agenda administrables avec connecteurs JSON-LD, Crawl4AI et ICS.
- JSON-LD `Event` prioritaire ; repli Mistral structuré uniquement en absence de
  JSON-LD sur des pages rendues par Crawl4AI.
- Boîte admin **À valider** obligatoire avant toute publication.
- Journal `EventImportRun`, dédoublonnage, statuts incomplet/doublon/rejeté/importé.
- Image officielle synchronisée automatiquement, avec remplacement manuel
  prioritaire depuis l'admin.
- Service Crawl4AI isolé sur `127.0.0.1:11235`, image `0.8.5`, ressources
  limitées et authentification JWT.
- Tâche Celery Beat de synchronisation des sources actives toutes les six heures.

### Validation production

- Git VPS et `origin/main` alignés, écart `0/0`.
- Migrations Agenda appliquées et `manage.py check` sans erreur.
- Django, Next, Celery worker/beat, Nginx, PostgreSQL et Redis actifs.
- Crawl4AI `running/healthy`, accès anonyme `/crawl` refusé en `401`.
- `/healthz/`, `/api/events/`, `/agenda`, `/marches` et `/decouvrir` à `200`.
- routes admin Agenda à `307` hors session, comportement attendu.
- Mistral et l'identité technique Crawl4AI configurés.

### Point non terminé

La production contient `0` source Agenda, `0` candidat et `0` exécution
d'import. Le code est déployé, mais le premier crawl d'un site officiel et la
validation métier réelle restent à faire.

MiaMapa reste une référence d'expérience utilisateur, pas une source intégrée.
Les sources prévues sont les sites officiels des villes, offices de tourisme et
organisateurs, sous réserve de droits de réutilisation documentés.

### Exploitation constatée

- Ubuntu 25.04 hors support : upgrade à préparer séparément.
- Deux sauvegardes PostgreSQL manuelles présentes.
- Script `/usr/local/bin/geoclicmedia-backup-pg` installé.
- Aucune planification cron ou timer trouvée : la sauvegarde quotidienne reste
  à automatiser et à tester par restauration.

### Prochaine étape validée par la logique produit

Configurer une première source officielle dans `/admin/agenda/sources`, lancer
le crawl, examiner le journal, corriger les candidats dans **À valider**, tester
l'image officielle et son remplacement, publier un événement, puis vérifier la
carte et l'idempotence au second passage.

La procédure complète et la feuille de route sont dans
`24-continuite-projet.md`.

---

## Extraction Agenda OVHcloud reprenable — 28 juillet 2026

**Branche locale** : `codex/feat-ovh-agenda-extraction`
**Base** : `b1be020`
**État historique au moment de l'écriture** : développé et validé localement.
Le lot a ensuite été fusionné par les PR `#80` et `#81`, puis déployé au commit
`4ee16d4`.

- Passerelle compatible OpenAI reutilisable par les generations GeoClic.
- OVHcloud `Qwen3.5-9B` retenu pour l'Agenda, sans migration des embeddings.
- Cache par segment et reprise apres erreur sans retraiter les succes.
- Segments de 12 000 caracteres avec chevauchement et fusion des occurrences.
- Réglage initial : trois tentatives et timeout lecture 120 secondes. La
  production utilise désormais deux tentatives et 100 secondes.
- Progression et erreurs visibles avec actualisation automatique dans l'admin.
- Ancienne methode candidat `mistral` migree vers la methode generique `ai`.
- Test reel OVH : HTTP 200, JSON valide en 2,07 secondes.
- 23 tests cibles, ESLint et build Next.js : OK.

Le token OVH reste exclusivement dans les environnements serveur. Aucun secret
n'est ajoute au depot.
### 28 juillet 2026 — Ajustement des délais OVH Agenda

- retour du test de production : une réponse riche Qwen a abouti en 87 s ;
- un segment indisponible a consommé 363,5 s avec `120 s x 3` ;
- nouveau compromis : `100 s x 2`, soit environ 203 s au pire avec la pause
  entre les tentatives, sans exclure les réponses riches déjà observées.

---

## Reprise LLM et état live Agenda — 29 juillet 2026

**Production vérifiée** : commit `4ee16d4`, PR `#80` et `#81` fusionnées.

- services Django, Next.js, Celery worker et beat actifs ;
- healthcheck public opérationnel ;
- source `ot le grau du roi` reliée au corpus partagé de `1045` pages actives ;
- extraction OVH `Qwen3.5-9B` en cours : `386/510` segments réussis,
  `1` échec et `378` événements dans le cache au moment du relevé ;
- aucun candidat ni événement publié à ce stade ;
- cause du vide dans **À valider** confirmée : les candidats ne sont créés
  qu'après la fin de l'extraction, la fusion et la normalisation ;
- document prioritaire ajouté :
  [`25-reprise-llm.md`](./25-reprise-llm.md).

Prochain chantier recommandé : création progressive et idempotente des
candidats, avec un statut provisoire jusqu'à la consolidation finale, sans
affaiblir la validation humaine ni le dédoublonnage.

---

## Images candidates et tri automatique des dates — décision du 29 juillet 2026

Diagnostic de production :

- `481` candidats ont été créés ;
- leurs `481` champs `image_url` contiennent la même image générique de dunes ;
- les images propres aux événements existent dans le HTML officiel sauvegardé,
  notamment sur `static.apidae-tourisme.com` ;
- la cause est la reprise systématique du `og:image` générique par le crawler,
  puis par `_normalize_ai()` ;
- la réparation peut être réalisée depuis `CrawledPage.raw_html_gzip`, sans
  recrawler les 1045 pages.

Décisions pour le prochain lot :

- sélectionner l'image de l'événement par priorité JSON-LD, contenu principal
  et association DOM/titre ; refuser l'image générique ;
- réparer les candidats existants de manière idempotente et auditée ;
- ajouter un premier tri automatique des dates ;
- retirer les occurrences déjà terminées d'une série ;
- conserver les événements en cours et toute série ayant une occurrence
  future ;
- tracer les candidats entièrement passés avec un statut `expired` et les
  exclure de la boîte courante **À valider** ;
- ne rien publier automatiquement.

Le cahier de reprise, les fichiers concernés, les tests et critères de fin sont
détaillés dans la section 15 de `25-reprise-llm.md`.

---

## Lot local images Agenda et candidats expirés — 29 juillet 2026

Branche `codex/agenda-event-images-expiration`. Aucun push, aucune fusion,
aucun déploiement et aucune modification des 481 candidats de production.

- ajout d'un sélecteur d'image local fondé sur `Event.image`, le titre et le
  conteneur DOM de la fiche ;
- rejet des OG et images de chrome répétées dans le corpus ;
- commande de réparation dry-run par défaut, idempotente et auditée ;
- ajout du statut `expired` et d'un compteur de run ;
- les événements terminés avant le début du crawl/import ne rejoignent plus
  **À valider** ;
- les séries mixtes conservent uniquement leurs occurrences non terminées ;
- les événements en cours restent disponibles jusqu'à leur fin réelle ;
- les expirés restent consultables dans un filtre admin, sans action publier ;
- correction de la sémantique `DTEND` exclusive pour les journées ICS.

Test en lecture seule sur les HTML stockés de production : 465 images
spécifiques sélectionnées et 16 absences d'image assumées, sans reprise de
l'image générique des dunes. Résultat non appliqué à la base.

Validations locales : tests ciblés Django, Ruff, contrôle des migrations,
ESLint et build Next.js réussis. Voir la section 16 de `25-reprise-llm.md`.
