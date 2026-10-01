import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSettings();
  return {
    name: site.tagline ? `${site.site_name} — ${site.tagline}` : site.site_name,
    short_name: site.site_name,
    description:
      "Le média local indépendant du littoral camarguais : actualités, patrimoine, mémoire vivante, portraits.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: site.primary_color,
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
