import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

export const revalidate = 3600; // sitemap rafraîchi 1 fois par heure

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://media.geoclic.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques publiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/commerces`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/agenda`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/marches`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/decouvrir`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/meteo`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/numeros-utiles`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/demarches`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tarifs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/recherche`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/politique-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/suppression-donnees`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Articles publiés
  let articleUrls: MetadataRoute.Sitemap = [];
  try {
    // On charge jusqu'à ~5 pages (100 articles) — suffisant en sprint 1.
    // Pour de très gros volumes, paginer ou faire un endpoint dédié.
    const data = await api.articles.list({ ordering: "-published_at" });
    articleUrls = data.results.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: a.updated_at ?? a.published_at ?? undefined,
      changeFrequency: "monthly",
      priority: a.is_featured ? 0.9 : 0.7,
    }));
  } catch {
    /* API indisponible : on sert quand même le sitemap statique */
  }

  // Catégories
  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const cats = await api.categories();
    categoryUrls = cats.map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    /* idem */
  }

  let eventUrls: MetadataRoute.Sitemap = [];
  try {
    const events = await api.events.list();
    eventUrls = events.results.map((event) => ({
      url: `${SITE_URL}/agenda/${event.slug}`,
      lastModified: event.updated_at,
      changeFrequency: "weekly",
      priority: event.is_featured ? 0.8 : 0.6,
    }));
  } catch {
    /* API indisponible : les pages statiques restent publiées. */
  }

  let placeUrls: MetadataRoute.Sitemap = [];
  try {
    const places = await api.discovery.list();
    placeUrls = places.results.map((place) => ({
      url: `${SITE_URL}/decouvrir/${place.slug}`,
      lastModified: place.updated_at,
      changeFrequency: "monthly",
      priority: place.is_featured ? 0.8 : 0.6,
    }));
  } catch {
    /* API indisponible : les pages statiques restent publiées. */
  }

  // Communes
  let communeUrls: MetadataRoute.Sitemap = [];
  try {
    const communes = await api.communes();
    communeUrls = communes.map((c) => ({
      url: `${SITE_URL}/communes/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));
  } catch {
    /* idem */
  }

  return [...staticPages, ...articleUrls, ...categoryUrls, ...eventUrls, ...placeUrls, ...communeUrls];
}
