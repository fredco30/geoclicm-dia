# geoclicMédia

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
| Front | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, @ducanh2912/next-pwa |
| Carto | MapLibre GL JS + tuiles MapTiler |
| Paiement | Stripe (sprint 4) |
| Email | Brevo (sprint 2+) |
| Analytics | Plausible |
| Diffusion | Meta Graph API → Page Facebook (sprint 2) |
| Infra | VPS OVH Ubuntu 24.04, Nginx, systemd, Let's Encrypt, Cloudflare |

## Sprints

- **Sprint 1** : Fondations (PWA installable + admin Django + déploiement) — *en cours*
- **Sprint 2** : Diffusion (Facebook auto, agenda, annuaire, carte)
- **Sprint 3** : Régie publicitaire
- **Sprint 4** : Espace annonceur + Stripe
- **Sprint 5** : Push, contributions citoyennes

Détail dans [`docs/`](docs/).

## Dev

Voir [`back/README.md`](back/README.md) et [`front/README.md`](front/README.md).
