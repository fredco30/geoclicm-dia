# GeoClic Média

> **État vérifié le 28 juillet 2026** : la plateforme et le pipeline Agenda
> (Crawl4AI, JSON-LD prioritaire, repli Mistral et validation humaine) sont
> déployés. Aucune source officielle n'est encore configurée en production :
> le premier crawl métier reste à effectuer. La référence de reprise est
> [`docs/24-continuite-projet.md`](docs/24-continuite-projet.md).

**Production** : <https://media.geoclic.fr>
**Dépôt** : <https://github.com/fredco30/geoclicm-dia>

Média local indépendant pour le littoral camarguais (Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte, Lunel, Vauvert, Camargue gardoise).

PWA + back-office Django, régie publicitaire commerçants à terme.

**Domaine** : [media.geoclic.fr](https://media.geoclic.fr)

## Architecture

Monorepo :

```
.
├── back/              # Django 5 + DRF + PostgreSQL/PostGIS + Celery + Redis
├── front/             # Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + next-pwa
└── docs/              # Documentation projet (vision, architecture, sprints)
```

## Stack

| Couche | Techno |
|---|---|
| Back | Django 5, DRF, PostgreSQL 16, PostGIS, Celery, Redis |
| Front | Next.js 16.2.4, React 19.2.4, TypeScript, Tailwind 4, @ducanh2912/next-pwa |
| Carto | MapLibre GL JS + tuiles raster OSM |
| Paiement | Stripe + dj-stripe ; activation commerciale à vérifier |
| Email | Brevo prévu, workflow non livré |
| Analytics | Plausible prévu, configuration de production non confirmée |
| Diffusion | Meta Graph API prévue, publication automatique non livrée |
| Infra | VPS OVH Ubuntu 25.04 hors support, Nginx, systemd, Docker, Let's Encrypt |

## Sprints

> La liste suivante est le plan historique. Plusieurs lots sont déjà livrés
> dans un ordre différent ; voir la continuité pour l'état courant.

- **Sprint 1** : Fondations (PWA installable + admin Django + déploiement) — *livré*
- **Sprint 2** : Diffusion (Facebook auto, agenda, annuaire, carte)
- **Sprint 3** : Régie publicitaire
- **Sprint 4** : Espace annonceur + Stripe
- **Sprint 5** : Push, contributions citoyennes

Détail dans [`docs/`](docs/).

## Dev

Voir [`back/README.md`](back/README.md) et [`front/README.md`](front/README.md).
