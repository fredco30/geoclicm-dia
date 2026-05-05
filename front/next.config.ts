import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  // Cache de navigation côté client désactivé : les pages dynamiques
  // (/admin/*, /advertiser/*, redirects 307 d'auth) ne doivent JAMAIS être
  // servies depuis le cache. Avoir laissé `cacheOnFrontEndNav` et
  // `aggressiveFrontEndNavCaching` à true a déjà causé des boucles fantômes
  // côté navigateur (le SW resservait un 307 d'auth périmé en boucle).
  // Les assets statiques (JS bundles, images, fonts) restent cachés
  // normalement via la config Workbox par défaut.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
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
