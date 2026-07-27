import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// PWA RÉACTIVÉE — front public uniquement, avec config sûre.
// =================================================================
//
// Historique :
// 1. La PWA était activée avec sa config par défaut → cache NetworkFirst
//    sur TOUTES les pages, y compris /admin/* et /advertiser/* → un 307
//    d'auth caché tournait en boucle (ERR_FAILED navigateur).
// 2. Désactivation complète d'urgence (`disable: true`) — pas de PWA du
//    tout pendant quelques heures.
// 3. Réactivation ciblée (présent fichier) avec un `runtimeCaching` custom
//    qui exclut explicitement les routes privées et les redirects.
//
// Pourquoi on garde la PWA en public :
// - Installable comme app sur mobile/desktop (icône home screen).
// - Lecture offline des articles déjà visités (touristes Camargue, zones
//   avec connexion 4G erratique sur les plages).
// - Chargement plus rapide (assets statiques cachés).
//
// Règles de cache strictes (cf workboxOptions.runtimeCaching plus bas) :
// - Assets statiques (JS bundles, images, fonts, CSS) : cachés
//   normalement (CacheFirst ou StaleWhileRevalidate).
// - Pages HTML publiques : NetworkFirst, MAIS uniquement si pathname ne
//   commence pas par /admin, /advertiser, /api, /django-admin, /stripe ou
//   /r/. ET on rejette toute réponse 3xx ou avec Set-Cookie pour ne
//   jamais cacher un redirect d'auth ou une page contextuelle.
// - cacheOnFrontEndNav et aggressiveFrontEndNavCaching restent OFF — ils
//   s'appliquaient à la stratégie de précache de navigation interne, qui
//   est la cause initiale du bug. On les laisse désactivés en
//   permanence.

const SAFE_CACHE_PLUGIN = {
  // Plugin commun : ne mémorise jamais les responses risquées
  // (redirects, erreurs, pages avec cookies modifiés). Sans ça, Workbox
  // cacherait par défaut les 200 ET les 3xx, ce qui était la cause du
  // bug initial.
  cacheWillUpdate: async ({ response }: { response: Response | null }) => {
    if (!response) return null;
    if (response.status >= 300) return null;
    if (response.type === "opaqueredirect") return null;
    if (response.headers.get("Set-Cookie")) return null;
    return response;
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  reloadOnOnline: true,
  // Désactivée en dev pour ne pas perturber le dev local (Hot Reload + cache
  // SW = recette pour passer 1h à chercher pourquoi un changement n'apparaît
  // pas).
  disable: process.env.NODE_ENV === "development",
  // Pas de cache de navigation interne — c'était la cause des boucles de
  // redirect fantômes. Les pages restent servies par le réseau via la règle
  // runtimeCaching ci-dessous, mais sans pré-caching agressif côté client.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    disableDevLogs: true,
    // Le SW prend le contrôle immédiatement à l'install / activation, ce
    // qui assure qu'un user avec un ancien SW (next-pwa default ou killer)
    // récupère vite la nouvelle config saine.
    skipWaiting: true,
    clientsClaim: true,
    // Override TOTAL des défauts next-pwa. Ce qui n'est pas listé ici n'est
    // pas géré par le SW (passe-plat réseau direct).
    runtimeCaching: [
      // ---- Polices ----
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: { maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },

      // ---- Images ----
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },

      // ---- Bundles JS / CSS Next.js ----
      {
        urlPattern: /\/_next\/static\/.+\.js$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-js",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-style-assets",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:js)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-js-assets",
          expiration: { maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 },
        },
      },

      // ---- Pages HTML publiques (lecture offline articles) ----
      // Garde uniquement les pages qui ne dépendent ni d'auth ni d'état
      // utilisateur. Tout ce qui touche au back-office passe direct par
      // le réseau, sans intermédiaire SW.
      {
        urlPattern: ({
          request,
          url,
          sameOrigin,
        }: {
          request: Request;
          url: URL;
          sameOrigin: boolean;
        }) =>
          sameOrigin &&
          request.method === "GET" &&
          request.headers.get("RSC") !== "1" && // ne cache pas les requêtes RSC
          !url.pathname.startsWith("/api/") &&
          !url.pathname.startsWith("/admin") &&
          !url.pathname.startsWith("/advertiser") &&
          !url.pathname.startsWith("/django-admin") &&
          !url.pathname.startsWith("/stripe") &&
          !url.pathname.startsWith("/r/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-public",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          plugins: [SAFE_CACHE_PLUGIN],
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/annuaire",
        destination: "/commerces",
        permanent: true,
      },
      {
        source: "/admin/users",
        destination: "/admin/settings/users",
        permanent: true,
      },
      {
        source: "/admin/ads/campaigns/:path*",
        destination: "/admin/regie/campagnes/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "135.125.159.142",
        port: "8002",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "media.geoclic.fr",
        pathname: "/media/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
