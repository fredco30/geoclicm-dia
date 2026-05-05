import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// PWA DÉSACTIVÉE EN URGENCE — 2026-05-06.
//
// Pourquoi : la stratégie par défaut de @ducanh2912/next-pwa met TOUTES les
// pages same-origin (sauf /api/) en cache NetworkFirst via la règle "pages".
// Quand un utilisateur reçoit un 307 d'authentification (cookie expiré, rôle
// insuffisant, layout protected qui redirige), ce 307 est mémorisé dans le
// cache "pages" du SW, puis resservi en boucle même quand la session
// redevient valide. Symptôme : ERR_TOO_MANY_REDIRECTS ou ERR_FAILED côté
// navigateur, alors que le serveur répond proprement (1 seul redirect).
//
// Le fix précédent (cacheOnFrontEndNav: false + aggressiveFrontEndNavCaching:
// false) ne suffit pas : ces options ne touchent que la stratégie de
// précache de navigation, pas les runtimeCaching par défaut.
//
// Pour rester simple et robuste, on désactive complètement next-pwa partout
// (dev + prod). Conséquences :
// - Plus aucun service worker enregistré sur le site.
// - Plus de cache offline / "ajouter à l'écran d'accueil" (l'aspect PWA pur).
// - Toutes les pages (publiques + admin + advertiser) sont servies
//   directement par le serveur, comme un site web classique.
//
// La fonctionnalité offline n'est pas critique en v1 : c'est un média
// d'actualité local + un back-office, pas un app qu'on consulte sans
// réseau. On pourra réintroduire un PWA plus tard avec une config saine
// (runtimeCaching custom qui exclut /admin/*, /advertiser/*, /api/* et les
// 3xx) si le besoin offline pour la lecture d'articles ressort.
const withPWA = withPWAInit({
  dest: "public",
  register: false,
  reloadOnOnline: false,
  disable: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
