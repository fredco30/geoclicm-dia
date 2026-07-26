# 23 — Carte des pages web

> Inventaire exhaustif des URLs du projet geoclicMédia.
> Généré le 2026-07-27 depuis `front/src/app/**/page.tsx` et
> `back/config/urls.py`.
>
> **Domaine de production** : <https://media.geoclic.fr>

---

## 1. Site public (`front/src/app/(site)/`)

Pages accessibles à tous, indexables SEO.

| URL | Fichier | Rôle |
|---|---|---|
| `/` | `(site)/page.tsx` | Accueil « pattern city » — grille de tuiles configurables |
| `/articles` | `(site)/articles/page.tsx` | Liste des articles éditoriaux |
| `/articles/<slug>` | `(site)/articles/[slug]/page.tsx` | Article détail |
| `/categories/<slug>` | `(site)/categories/[slug]/page.tsx` | Articles d'une catégorie (Patrimoine, Portraits, Tribune libre…) |
| `/commerces` | `(site)/commerces/page.tsx` | Annuaire des commerçants + carte MapLibre |
| `/commerces/<slug>` | `(site)/commerces/[slug]/page.tsx` | Fiche commerçant |
| `/agenda` | `(site)/agenda/page.tsx` | Agenda des événements & marchés |
| `/agenda/<slug>` | `(site)/agenda/[slug]/page.tsx` | Événement détail |
| `/communes/<slug>` | `(site)/communes/[slug]/page.tsx` | Page territoire (Le Grau-du-Roi, Aigues-Mortes…) |
| `/meteo` | `(site)/meteo/page.tsx` | Météo — vue globale littoral |
| `/meteo/<commune>` | `(site)/meteo/[commune]/page.tsx` | Météo d'une commune (Open-Meteo) |
| `/numeros-utiles` | `(site)/numeros-utiles/page.tsx` | Rubrique Pratique — numéros utiles |
| `/demarches` | `(site)/demarches/page.tsx` | Rubrique Pratique — démarches administratives |
| `/recherche` | `(site)/recherche/page.tsx` | Recherche transverse |
| `/tiles/<id>` | `(site)/tiles/[id]/page.tsx` | Page générée par une tuile d'accueil |
| `/tarifs` | `(site)/tarifs/page.tsx` | Offres régie pub / abonnements annonceurs |
| `/contact` | `(site)/contact/page.tsx` | Formulaire de contact |

### Pages légales

| URL | Fichier |
|---|---|
| `/mentions-legales` | `(site)/mentions-legales/page.tsx` |
| `/cgu` | `(site)/cgu/page.tsx` |
| `/politique-confidentialite` | `(site)/politique-confidentialite/page.tsx` |
| `/suppression-donnees` | `(site)/suppression-donnees/page.tsx` (requis par Meta pour l'app Facebook) |

### Fichiers générés (pas des pages)

| URL | Fichier |
|---|---|
| `/sitemap.xml` | `app/sitemap.ts` |
| `/robots.txt` | `app/robots.ts` |
| `/manifest.webmanifest` | `app/manifest.ts` (PWA) |

---

## 2. Back-office rédaction (`/admin/*`)

Interface custom Next.js — **pas** le Django Admin.
Accès réservé aux comptes `can_publish` (rôle `editor` / `admin` ou superuser).

| URL | Fichier | Rôle |
|---|---|---|
| `/admin/login` | `admin/login/page.tsx` | Connexion (champ **identifiant**, pas email) |
| `/admin` | `admin/(protected)/page.tsx` | Tableau de bord |

### Éditorial

| URL | Rôle |
|---|---|
| `/admin/articles` | Liste des articles |
| `/admin/articles/new` | Nouvel article |
| `/admin/articles/<slug>/edit` | Édition d'un article |
| `/admin/articles/categories` | Catégories d'articles |
| `/admin/articles/categories/new` | Nouvelle catégorie |
| `/admin/articles/categories/<slug>/edit` | Édition d'une catégorie |

### Annuaire commerçants

| URL | Rôle |
|---|---|
| `/admin/directory/businesses` | Liste des commerçants |
| `/admin/directory/businesses/new` | Nouveau commerçant |
| `/admin/directory/businesses/<slug>/edit` | Édition d'un commerçant |
| `/admin/directory/categories` | Catégories commerçants |
| `/admin/directory/categories/new` | Nouvelle catégorie |
| `/admin/directory/categories/<slug>/edit` | Édition d'une catégorie |

### Agenda

| URL | Rôle |
|---|---|
| `/admin/agenda` | Liste des événements |
| `/admin/agenda/new` | Nouvel événement |
| `/admin/agenda/<slug>/edit` | Édition d'un événement |
| `/admin/agenda/categories` | Catégories d'événements |

### Régie publicitaire

| URL | Rôle |
|---|---|
| `/admin/regie/campagnes` | Liste des campagnes |
| `/admin/regie/campagnes/new` | Nouvelle campagne |
| `/admin/regie/campagnes/<id>/edit` | Édition d'une campagne |

> ⚠️ Chemin volontairement `/regie/` et non `/ads/` — uBlock bloque
> agressivement `/ads/`, `/banner/`, `/popup/`. Voir `CLAUDE.md`.

### Configuration

| URL | Rôle |
|---|---|
| `/admin/tiles` | Tuiles d'accueil |
| `/admin/tiles/new` | Nouvelle tuile |
| `/admin/tiles/<id>/edit` | Édition d'une tuile |
| `/admin/utility` | Rubrique Pratique (numéros + démarches) |
| `/admin/utility/new` | Nouvelle entrée |
| `/admin/utility/<id>/edit` | Édition d'une entrée |
| `/admin/assistant/sources` | Sources indexées par l'assistant IA |
| `/admin/assistant/sources/new` | Nouvelle source |
| `/admin/assistant/sources/<id>/edit` | Édition d'une source |
| `/admin/settings/users` | Comptes & droits |
| `/admin/settings/users/new` | Nouveau compte |
| `/admin/settings/users/<id>/edit` | Édition d'un compte |

---

## 3. Espace annonceurs (`/advertiser/*`)

Self-service pour les commerçants clients. Rôle `advertiser`.

| URL | Fichier | Rôle |
|---|---|---|
| `/advertiser/login` | `advertiser/login/page.tsx` | Connexion annonceur |
| `/advertiser/register` | `advertiser/register/page.tsx` | Inscription |
| `/advertiser` | `advertiser/(protected)/page.tsx` | Tableau de bord annonceur |
| `/advertiser/fiches` | | Ses fiches commerçant |
| `/advertiser/fiches/new` | | Nouvelle fiche |
| `/advertiser/fiches/<slug>/edit` | | Édition d'une fiche |
| `/advertiser/campagnes` | | Ses campagnes publicitaires |
| `/advertiser/campagnes/new` | | Nouvelle campagne |
| `/advertiser/campagnes/<id>/edit` | | Édition d'une campagne |
| `/advertiser/abonnement` | | Abonnement Stripe (plan, factures) |

---

## 4. Backend Django (`back/config/urls.py`)

Servi derrière Nginx, même domaine.

| URL | Rôle |
|---|---|
| `/django-admin/` | Django Admin — **debug / seed uniquement**, pas l'outil quotidien |
| `/healthz/` | Healthcheck monitoring (UptimeRobot) |
| `/r/<id>/` | Redirect tracker des clics sur encarts pub (chemin neutre anti-adblock) |
| `/stripe/` | Webhooks dj-stripe |

### API REST (`/api/`)

Une inclusion par app métier : `core`, `editorial`, `directory`, `ads`,
`advertisers`, `weather`, `tiles`, `assistant`, `utility`, `events`,
plus `/api/ai-assist/`.

| URL | Rôle |
|---|---|
| `/api/schema/` | Schéma OpenAPI brut |
| `/api/schema/swagger-ui/` | Documentation Swagger interactive |
| `/api/schema/redoc/` | Documentation Redoc |

---

## Notes

- **Les URLs publiques ne contiennent jamais `ads`, `banner` ou `popup`** —
  30-40 % du trafic FR utilise un bloqueur. Préférer `/regie/`,
  `/sponsors/`, `/encarts/`, `/r/`.
- **Le Service Worker PWA exclut** `/admin/*`, `/advertiser/*`, `/api/*`,
  `/django-admin/*`, `/stripe/*`, `/r/*` du cache. Voir
  `front/next.config.ts`.
- Le cache Next (`revalidate: 300`) n'est pas invalidé après une
  modification admin : jusqu'à 5 min de décalage sur la home.
  Workaround : `sudo systemctl restart geoclicmedia-next`.

## Voir aussi

- `21-registre-routes-promesses.md` — routes promises vs livrées
- `22-architecture-agenda-marches-decouvrir.md` — détail de l'agenda
- `19-plan-refonte-portail-v2.md` — chantier « pattern city »
