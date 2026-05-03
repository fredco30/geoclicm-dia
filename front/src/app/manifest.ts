import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "geoclicMédia — le littoral camarguais",
    short_name: "geoclicMédia",
    description:
      "Le média local indépendant du littoral camarguais : actualités, patrimoine, mémoire vivante, portraits.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a4d6e",
    orientation: "portrait",
    lang: "fr-FR",
    categories: ["news", "magazines", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
