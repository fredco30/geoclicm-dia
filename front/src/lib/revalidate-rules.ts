/**
 * Tags de cache Next (cf. `next.tags` dans lib/api.ts) à invalider selon
 * l'endpoint Django modifié. Correspondance par mot-clé pour couvrir les
 * variantes admin, imports (« À valider ») et annonceur.
 *
 * Module partagé : le navigateur s'en sert pour n'appeler la Server Action
 * que lorsqu'il y a quelque chose à invalider, le serveur pour décider.
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

export function tagsForWrite(apiPath: string): string[] {
  // Connexion, déconnexion, mot de passe : aucune page publique concernée.
  if (apiPath.startsWith("/api/auth/")) return [];
  return Array.from(new Set(RULES.filter((rule) => rule.match(apiPath)).flatMap((rule) => rule.tags)));
}
