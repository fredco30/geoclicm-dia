# 03 — Architecture technique

## Stack globale

### Backend

- **Django 5.x** + **Django REST Framework** (API REST)
- **PostgreSQL 16** + **PostGIS** (géolocalisation, requêtes spatiales)
- **Redis** (cache, broker Celery)
- **Celery** + **Celery Beat** (tâches asynchrones et planifiées)
- **Gunicorn** (serveur WSGI)

### Frontend

- **Next.js 15** (App Router, Server Components, ISR)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (système de composants)
- **next-pwa** (`@ducanh2912/next-pwa`) pour la PWA
- **MapLibre GL JS** (cartographie, alternative open-source à Mapbox)
- **Tuiles MapTiler** (offre gratuite jusqu'à 100k req/mois)

### Infrastructure

- **VPS OVH** (existant, mutualisé avec GéoClic)
- **Nginx** (reverse proxy, SSL via Let's Encrypt)
- **Cloudflare** (CDN, WAF, cache HTML, gratuit)
- **systemd** (gestion des services)

### Services tiers

- **Stripe** (paiements abonnements et achats one-shot)
- **Brevo** ex-Sendinblue (envoi emails transactionnels et newsletter)
- **Plausible Analytics** (auto-hébergé sur VPS, RGPD-friendly)
- **Meta Graph API** (publication automatique Page Facebook)
- **OVH Object Storage** ou stockage local VPS (images uploadées)

## Schéma général

```
┌─────────────────────────────────────────────────────────────┐
│                         UTILISATEURS                          │
│ Lecteurs (PWA) │ Annonceurs (espace web) │ Rédacteurs (admin)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │   Cloudflare CDN + WAF    │
                └──────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │     Nginx (VPS OVH)       │
                └──────────────────────────┘
                    │                  │
        ┌───────────┘                  └──────────┐
        ▼                                          ▼
  ┌──────────────┐                         ┌──────────────┐
  │  Next.js SSR │ ─── API REST ─────────▶ │ Django + DRF │
  │  (port 3001) │                         │ (port 8001)  │
  └──────────────┘                         └──────┬───────┘
                                                  │
                            ┌─────────────────────┼─────────────┐
                            ▼                     ▼             ▼
                    ┌───────────────┐    ┌──────────────┐  ┌─────────┐
                    │ PostgreSQL 16 │    │    Redis     │  │ Storage │
                    │  + PostGIS    │    │ cache+broker │  │ images  │
                    └───────────────┘    └──────────────┘  └─────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ Celery worker│
                                          │ + Beat       │
                                          └──────┬───────┘
                                                 │
                            ┌────────────────────┼────────────────┐
                            ▼                    ▼                ▼
                       Meta Graph API        Stripe           Brevo emails
```

## Organisation du code

### Backend Django

```
camargue_media/
├── apps/
│   ├── core/              # users, profils, communes, media management
│   ├── editorial/         # articles, catégories, tags
│   ├── events/            # agenda événementiel
│   ├── directory/         # commerçants, fiches, géoloc
│   ├── ads/               # encarts, campagnes, ciblage
│   ├── advertisers/       # comptes annonceurs, abonnements Stripe
│   ├── distribution/      # sync Facebook/Instagram, syndication
│   ├── newsletter/        # gestion campagnes Brevo
│   ├── analytics/         # tracking interne, agrégats stats
│   └── api/               # endpoints DRF agrégés, schéma OpenAPI
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   ├── celery.py
│   └── wsgi.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── static/
├── media/
├── templates/
└── manage.py
```

### Frontend Next.js

```
camargue-media-front/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # accueil
│   │   ├── articles/
│   │   │   ├── page.tsx                # liste
│   │   │   └── [slug]/page.tsx         # détail
│   │   ├── agenda/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── annuaire/
│   │   │   ├── page.tsx
│   │   │   ├── [category]/page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── territoire/
│   │   │   └── [commune]/page.tsx      # pages communes (SEO local)
│   │   ├── carte/page.tsx
│   │   └── recherche/page.tsx
│   ├── (advertiser)/                   # bloc 4 (sprint 4+)
│   │   ├── login/
│   │   ├── inscription/
│   │   ├── dashboard/
│   │   ├── ma-fiche/
│   │   └── facturation/
│   ├── api/                            # API routes Next (proxy si besoin)
│   ├── manifest.ts                     # PWA manifest
│   ├── sitemap.ts                      # sitemap dynamique
│   ├── robots.ts
│   └── layout.tsx
├── components/
│   ├── ui/                             # shadcn components
│   ├── editorial/                      # ArticleCard, ArticleHero, etc.
│   ├── ads/                            # composants d'encarts
│   ├── map/                            # MapLibre wrappers
│   └── widgets/                        # widgets transverses
├── lib/
│   ├── api.ts                          # client API typé
│   ├── seo.ts                          # helpers SEO
│   └── utils.ts
├── public/
│   ├── icons/                          # icônes PWA toutes tailles
│   └── images/
└── next.config.js
```

## Choix techniques justifiés

### Pourquoi Django plutôt que FastAPI/Node ?

- Réutilisation directe du savoir-faire et du code GéoClic
- Admin Django ultra mature pour les rédacteurs (gain de semaines de dev)
- ORM solide pour les modèles complexes (relations, géoloc)
- Écosystème riche pour CMS-like

### Pourquoi Next.js plutôt que React pur / Vite ?

- SSR natif essentiel pour le SEO (cible touristique = trafic organique)
- ISR pour régénérer les pages éditoriales sans rebuild complet
- Image optimization native (WebP/AVIF, lazy loading, srcset)
- Routing fichier intuitif
- PWA prête en quelques lignes via next-pwa

### Pourquoi PWA plutôt qu'app native ?

- Pas de validation Apple/Google (gain de 2-6 semaines)
- Pas de comptes développeurs payants au début
- Mises à jour instantanées sans review
- 95% des fonctionnalités natives sont disponibles
- Capacitor permet le passage en app native plus tard si besoin

### Pourquoi MapLibre plutôt que Google Maps / Leaflet ?

- Open source, pas de coûts cachés
- Rendu vectoriel fluide en mobile
- Style personnalisable (carte aux couleurs camarguaises)
- Clustering performant
- Compatible PWA hors-ligne

### Pourquoi Stripe plutôt que GoCardless / autre ?

- Documentation excellente
- Intégration Django mature (django-stripe / dj-stripe)
- Gestion abonnements + paiements one-shot dans la même API
- Factures auto-générées
- Frais raisonnables (1.4% + 0.25 € EU)

### Pourquoi Plausible plutôt que GA4 ?

- RGPD-compatible nativement (pas de bandeau cookies)
- Données en Europe
- Interface simple à comprendre côté annonceurs (« voici vos stats »)
- Auto-hébergeable gratuitement

## Configuration Nginx

Cohabitation avec geoclic.fr sur le même VPS, vhosts séparés.

```nginx
# /etc/nginx/sites-available/camargue-media
server {
    listen 443 ssl http2;
    server_name lecamarguais.fr www.lecamarguais.fr;

    ssl_certificate /etc/letsencrypt/live/lecamarguais.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lecamarguais.fr/privkey.pem;

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Django
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Médias uploadés
    location /media/ {
        alias /var/www/camargue-media/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static Django
    location /static/ {
        alias /var/www/camargue-media/static/;
        expires 30d;
    }
}

server {
    listen 80;
    server_name lecamarguais.fr www.lecamarguais.fr;
    return 301 https://$host$request_uri;
}
```

## Services systemd

À créer :

- `camargue-django.service` — gunicorn pour Django (port 8001)
- `camargue-next.service` — Next.js production server (port 3001)
- `camargue-celery-worker.service` — worker Celery
- `camargue-celery-beat.service` — scheduler tâches périodiques

## Sécurité de base

- HTTPS obligatoire partout (Let's Encrypt + auto-renew)
- Headers de sécurité Nginx (HSTS, X-Frame-Options, CSP adaptée)
- Variables sensibles en `.env` (jamais en Git)
- Page Access Token Facebook chiffré en base
- Rate limiting sur endpoints publics (django-ratelimit)
- 2FA obligatoire sur l'admin Django pour tous les staff
- Backups quotidiens base de données + médias
- Monitoring uptime (UptimeRobot ou équivalent)

## Migrations et déploiements

Pipeline simple à mettre en place :

```bash
# Sur le VPS, dans /var/www/camargue-media
git pull origin main
source venv/bin/activate
pip install -r requirements/prod.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart camargue-django
sudo systemctl restart camargue-celery-worker

# Sur le frontend
cd /var/www/camargue-media-front
git pull origin main
npm ci
npm run build
sudo systemctl restart camargue-next
```

À industrialiser plus tard via GitHub Actions si besoin.
