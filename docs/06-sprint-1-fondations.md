# 06 — Sprint 1 : Fondations (2 semaines)

## Objectif

À la fin du sprint, on doit avoir :
- Une PWA installable qui affiche des articles
- Un back-office Django où la rédactrice peut publier des articles
- Le site déployé en production sur le domaine final, en HTTPS
- Le pipeline `git push → mise en prod` qui fonctionne

## Découpage jour par jour

### Jour 1 — Setup et fondations (4-6h)

**Matin** :
- [ ] Acheter le nom de domaine définitif (vérifier dispo : `lecamarguais.fr`, `camargue.media`, `littoralmag.fr`, `petite-camargue.fr`)
- [ ] Configurer DNS chez OVH (A record VPS, CNAME www, MX si email pro)
- [ ] Créer 2 repos Git : `camargue-media-back` et `camargue-media-front` (GitHub privé)
- [ ] Initialiser projet Django avec template inspiré de GéoClic

**Après-midi** :
- [ ] Settings Django : `base.py`, `dev.py`, `prod.py`
- [ ] Configurer custom User model dès le départ (apps/core/)
- [ ] Setup DRF + CORS + drf-spectacular
- [ ] Créer base PostgreSQL + activer extension PostGIS
- [ ] Premier déploiement vide sur VPS (vhost Nginx, gunicorn, certificat Let's Encrypt)
- [ ] Tester accès HTTPS au domaine, voir page d'accueil Django

### Jours 2-3 — Modèles éditoriaux + admin (8-10h)

- [ ] Créer apps `core` et `editorial`
- [ ] Modèles : `User`, `Commune`, `Media`, `Category`, `Tag`, `Article`
- [ ] Migrations + données de seed :
  - 8-10 communes du territoire
  - 8-10 catégories éditoriales (Mémoire vivante, Patrimoine, Pêche et traditions, Portraits, Reportages, Archives photos, Événements, Bons plans)
  - Tags transversaux courants
- [ ] Configurer Django Admin proprement :
  - `list_display` intelligents
  - `search_fields`, `list_filter`
  - `prepopulated_fields` pour slugs
  - `filter_horizontal` pour tags et galleries
  - Inline pour gestion galerie photos
- [ ] Upload d'images avec redimensionnement auto via Pillow (3 tailles : thumbnail 400px, medium 800px, large 1600px)
- [ ] Saisir 3-4 articles de test pour avoir du contenu pendant le dev frontend
- [ ] Configurer 2FA admin (django-otp)

### Jours 4-5 — API REST (6-8h)

- [ ] Sérialiseurs DRF pour tous les modèles publics
- [ ] ViewSets en lecture publique (pas d'auth) :
  - `GET /api/articles/` avec filtres et pagination
  - `GET /api/articles/<slug>/` détail
  - `GET /api/categories/`
  - `GET /api/communes/`
  - `GET /api/tags/`
  - `GET /api/search/?q=...` recherche full-text PostgreSQL
- [ ] Filtres via django-filter : par category, commune, tag, date
- [ ] Pagination par défaut : 20 articles/page
- [ ] Cache HTTP 60s sur les listes (`@method_decorator(cache_page(60))`)
- [ ] Documentation Swagger auto-générée (`/api/schema/swagger-ui/`)
- [ ] Tests unitaires sur les endpoints publics

### Jours 6-7 — Setup Next.js + PWA (6-8h)

```bash
npx create-next-app@latest camargue-media-front --typescript --tailwind --app --src-dir
cd camargue-media-front
npm install @ducanh2912/next-pwa
npm install lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge input separator
```

- [ ] Configuration PWA dans `next.config.js`
- [ ] Manifest PWA (`app/manifest.ts`)
- [ ] Service worker auto-généré (next-pwa)
- [ ] Layout principal avec navigation mobile-first
- [ ] Footer avec mentions légales (placeholder)
- [ ] Génération icônes PWA toutes tailles (192, 384, 512, maskable)
- [ ] Configuration TypeScript stricte
- [ ] Configuration ESLint + Prettier

`next.config.js` :

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lecamarguais.fr' },
    ],
  },
});
```

`app/manifest.ts` :

```typescript
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Le Camarguais — Média du littoral',
    short_name: 'Camarguais',
    description: 'L\'actualité, l\'histoire et le patrimoine du littoral camarguais',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a4d6e',
    orientation: 'portrait',
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

### Jours 8-9 — Pages publiques (8-10h)

**Page d'accueil** (`app/page.tsx`) :
- [ ] Hero avec article "à la une" (filtre `is_featured=true`)
- [ ] Grille 12 derniers articles
- [ ] Section catégories en chips cliquables
- [ ] Liens placeholder vers /agenda et /annuaire
- [ ] Footer riche

**Page article** (`app/articles/[slug]/page.tsx`) :
- [ ] SSR pur via `generateStaticParams` + ISR (revalidate: 3600)
- [ ] `generateMetadata` dynamique (Open Graph + Twitter Card)
- [ ] Mise en page lisible : titre, chapeau, photo, corps, métadonnées
- [ ] Boutons partage : Facebook, WhatsApp, copier-le-lien
- [ ] Section "Articles similaires" (même catégorie ou tags partagés)
- [ ] Markdown rendu via `react-markdown` ou similaire
- [ ] Images cliquables pour zoom

**Page liste catégorie** (`app/categories/[slug]/page.tsx`) :
- [ ] Header avec nom + description
- [ ] Grille paginée
- [ ] Pagination accessible

**Page recherche** (`app/recherche/page.tsx`) :
- [ ] Input avec debounce
- [ ] Résultats en temps réel via API
- [ ] Highlight des termes recherchés

**Composants à créer** :
- [ ] `<ArticleCard>` (vignette de liste)
- [ ] `<ArticleHero>` (mise en avant)
- [ ] `<ArticleBody>` (rendu Markdown)
- [ ] `<CategoryBadge>`
- [ ] `<ShareButtons>`
- [ ] `<Pagination>`

### Jour 10 — Polish + déploiement (4-6h)

- [ ] Lighthouse audit (objectif > 90 partout)
- [ ] Test installation PWA Android Chrome
- [ ] Test installation PWA iOS Safari (ajout écran d'accueil)
- [ ] Test responsive 320px / 768px / 1440px
- [ ] Configuration Nginx finale (vhost Next.js + Django)
- [ ] Service systemd `camargue-next.service`
- [ ] Service systemd `camargue-django.service`
- [ ] Test du parcours visiteur complet
- [ ] Backup automatique base de données configuré (cron quotidien)
- [ ] Monitoring uptime (UptimeRobot gratuit)
- [ ] Documentation interne pour la rédactrice : "Comment publier un article"
- [ ] Soumission sitemap Google Search Console (sitemap simple à ce stade)

## Pages annexes minimum (pour conformité)

À créer avant déploiement :
- [ ] `/mentions-legales`
- [ ] `/politique-confidentialite` (avec mention Facebook obligatoire pour Meta App Review)
- [ ] `/cgu`
- [ ] `/contact`
- [ ] `/suppression-donnees` (URL requise pour Meta)

## Ce que vous avez à la fin du sprint 1

✅ Site public en ligne, HTTPS, performant
✅ Back-office Django opérationnel
✅ PWA installable
✅ 10-15 articles seed en ligne
✅ Pipeline de déploiement fonctionnel

## Ce que vous N'AVEZ PAS encore (et c'est normal)

- ❌ Diffusion automatique Facebook (sprint 2)
- ❌ Agenda événementiel (sprint 2)
- ❌ Annuaire commerçants (sprint 2)
- ❌ Carte interactive (sprint 2)
- ❌ Encarts publicitaires (sprint 3)
- ❌ Espace annonceur (sprint 4)
- ❌ Notifications push (sprint 5)

## Décisions à prendre AVANT de démarrer

1. **Nom du projet et domaine** — bloquant pour tout le reste
2. **Identité visuelle de base** — au moins logo simple + 2 couleurs
3. **Charte éditoriale** — ton, rythme, rubriques (côté partenaire)
4. **Compte Meta Developer + Business Manager créés** (à anticiper, voir 08-meta-app-setup.md)
5. **Discussion équipe** : alignement vision, calendrier, répartition juridique future

## Questions à se poser pendant le sprint

- L'admin Django est-il assez intuitif pour la rédactrice ? Si non, customiser
- Le rendu mobile est-il vraiment fluide ? Tester sur vrais devices
- Le SEO est-il déjà solide à ce stade ? Inspecter avec Search Console
- Les performances tiennent-elles avec 100, 500 articles ? Tester avec données seedées
