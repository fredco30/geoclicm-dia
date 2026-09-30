import type { MetadataRoute } from "next";
import { api, apiGet } from "@/lib/api";
import type { Paginated } from "@/types/api";

export const revalidate = 3600; // sitemap rafraîchi 1 fois par heure

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://media.geoclic.fr";

/** Parcourt toutes les pages d'une liste publique (200 par page, 25 pages max). */
async function fetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  try {
    for (let page = 1; page <= 25; page++) {
      const data = await apiGet<Paginated<T>>(
        `${path}${separator}page=${page}&page_size=200`,
        { revalidate: 3600 },
      );
      items.push(...data.results);
      if (!data.next) break;
    }
  } catch {
    /* API indisponible : on garde ce qui a été chargé */
  }
  return items;
}

type WithSlug = { slug: string; updated_at?: string; published_at?: string | null; is_featured?: boolean };
type ListingItem = { slug: string; category: { slug: string }; published_at: string | null };

const LISTING_BASE: Record<string, string> = {
  "offres-d-emploi": "/emploi",
  "locations-annuelles": "/locations-annuelles",
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques publiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/commerces`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/gastronomie`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/agenda`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/marches`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/decouvrir`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/emploi`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/locations-annuelles`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/meteo`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/numeros-utiles`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/demarches`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tarifs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/politique-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/suppression-donnees`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [articles, events, places, businesses, listings, categories, communes] =
    await Promise.all([
      fetchAll<WithSlug>("/api/articles/?ordering=-published_at"),
      fetchAll<WithSlug>("/api/events/"),
      fetchAll<WithSlug>("/api/places/"),
      fetchAll<WithSlug>("/api/businesses/?ordering=name"),
      fetchAll<ListingItem>("/api/listings/"),
      api.categories().catch(() => []),
      api.communes().catch(() => []),
    ]);

  const entries = (
    items: WithSlug[],
    base: string,
    changeFrequency: "daily" | "weekly" | "monthly",
    priority: number,
  ): MetadataRoute.Sitemap =>
    items.map((item) => ({
      url: `${SITE_URL}${base}/${item.slug}`,
      lastModified: item.updated_at ?? item.published_at ?? undefined,
      changeFrequency,
      priority: item.is_featured ? Math.min(priority + 0.2, 1) : priority,
    }));

  const listingUrls: MetadataRoute.Sitemap = listings.flatMap((listing) => {
    const base = LISTING_BASE[listing.category?.slug];
    return base
      ? [{
          url: `${SITE_URL}${base}/${listing.slug}`,
          lastModified: listing.published_at ?? undefined,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        }]
      : [];
  });

  return [
    ...staticPages,
    ...entries(articles, "/articles", "monthly", 0.7),
    ...categories.map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...entries(events, "/agenda", "weekly", 0.6),
    ...entries(places, "/decouvrir", "monthly", 0.6),
    ...entries(businesses, "/commerces", "monthly", 0.6),
    ...listingUrls,
    ...communes.map((c) => ({
      url: `${SITE_URL}/communes/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
