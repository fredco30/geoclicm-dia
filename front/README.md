# geoclicMédia — front

PWA Next.js 16 (App Router) + TypeScript + Tailwind 4.

## Stack

- **Next.js 16.2** App Router (RSC, ISR, SSR)
- **React 19**
- **TypeScript** strict
- **Tailwind 4** (palette via CSS vars)
- **@ducanh2912/next-pwa 10.2.9** — service worker + manifest
- **lucide-react** — icônes
- **react-markdown + remark-gfm** — rendu corps article
- **shadcn/ui** (sera ajouté ÉTAPE 5b pour le back-office)

## Structure

```
front/
├── public/
│   ├── favicon.ico
│   └── icons/                # icônes PWA (192, 512, maskable, apple-touch)
├── src/
│   ├── app/                  # App Router
│   │   ├── layout.tsx        # layout racine + Header + Footer
│   │   ├── page.tsx          # accueil (hero + grille)
│   │   ├── manifest.ts       # PWA manifest
│   │   └── globals.css
│   ├── components/
│   │   ├── articles/         # ArticleCard, CategoryBadge
│   │   └── layout/           # Header, Footer
│   ├── lib/
│   │   ├── api.ts            # client API typé (apiGet, apiFetch, auth)
│   │   └── utils.ts          # cn, formatDate, timeAgo
│   └── types/
│       └── api.ts            # types miroir des serializers DRF
├── next.config.ts            # config + next-pwa
├── package.json              # build forcé en --webpack (next-pwa)
└── .env.local                # NEXT_PUBLIC_API_URL (non committé)
```

## Dev

```bash
cd front && npm install && cp .env.example .env.local && npm run dev
# http://localhost:3001 — Turbopack en dev (fast refresh)
```

## Build prod

```bash
npm run build && npm start
# build : webpack (forcé pour next-pwa) — start : :3001
```

## Spécificités Next.js 16 (breaking 15→16)

- `params` et `searchParams` sont `Promise` — toujours `await`.
- `cookies()` et `headers()` (`next/headers`) async — toujours `await`.
- Turbopack par défaut en `dev`, **`build` forcé en `--webpack`** car next-pwa injecte une config webpack incompatible.
- `fetch` n'est plus cached par défaut → ISR explicite via `{ next: { revalidate: 3600 } }`.
- `revalidateTag(tag, profile)` requiert second arg cacheLife.

## Conventions

- **Server components** par défaut, `"use client"` uniquement si nécessaire.
- **ISR** : 60s sur l'accueil, 3600s sur les articles/catégories/communes.
- **API client** : `api.*` depuis `@/lib/api` (typé, jamais `fetch` direct).
- **Images** : `cover_image.medium` pour cards, `.large` pour hero.
- **Mobile-first** : tester 320 / 768 / 1440px.

## Variables d'env

| Variable | Dev | Prod |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://135.125.159.142:8002` | `https://media.geoclic.fr` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | `https://media.geoclic.fr` |
