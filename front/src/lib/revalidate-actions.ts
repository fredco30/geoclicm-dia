"use server";

import { updateTag } from "next/cache";

import { getCurrentUser } from "@/lib/auth-server";

/**
 * Tags de cache Next (cf. `next.tags` dans lib/api.ts) à invalider selon
 * l'endpoint Django modifié. Correspondance par mot-clé pour couvrir les
 * variantes admin, imports (« À valider ») et annonceur.
 */
const RULES: { match: (path: string) => boolean; tags: string[] }[] = [
  { match: (p) => p.includes("article") || p.startsWith("/api/admin/categories"), tags: ["articles", "categories"] },
  { match: (p) => p.includes("business"), tags: ["businesses", "business-categories"] },
  { match: (p) => p.includes("event"), tags: ["events", "event-categories"] },
  { match: (p) => p.includes("place"), tags: ["places", "place-categories"] },
  { match: (p) => p.includes("listing"), tags: ["listings", "listing-categories"] },
  { match: (p) => p.includes("tiles"), tags: ["tiles"] },
  { match: (p) => p.includes("utility"), tags: ["utility"] },
  { match: (p) => p.includes("site-settings"), tags: ["site-settings"] },
];

/**
 * Après une écriture réussie depuis le back-office, rafraîchit
 * immédiatement les pages publiques concernées (au lieu d'attendre la
 * revalidation ISR de 5 à 60 min). Réservé aux sessions connectées.
 */
export async function revalidateAfterWrite(apiPath: string): Promise<void> {
  const tags = new Set(RULES.filter((rule) => rule.match(apiPath)).flatMap((rule) => rule.tags));
  if (tags.size === 0) return;
  if (!(await getCurrentUser())) return;
  for (const tag of tags) updateTag(tag);
}
