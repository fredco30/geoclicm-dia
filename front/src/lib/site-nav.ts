/** Rubriques principales du site public (en-tête, menu mobile, pied de page). */
export const MAIN_NAV = [
  { href: "/articles", label: "Actualités" },
  { href: "/agenda", label: "Agenda" },
  { href: "/marches", label: "Marchés" },
  { href: "/commerces", label: "Commerces" },
  { href: "/decouvrir", label: "Découvrir" },
  { href: "/meteo", label: "Météo" },
] as const;

/** Rubriques secondaires (menu mobile, pied de page). */
export const SECONDARY_NAV = [
  { href: "/gastronomie", label: "Gastronomie" },
  { href: "/emploi", label: "Emploi" },
  { href: "/locations-annuelles", label: "Locations à l'année" },
  { href: "/numeros-utiles", label: "Numéros utiles" },
  { href: "/demarches", label: "Démarches" },
  { href: "/recherche", label: "Rechercher un article" },
] as const;

/** Les 7 communes du territoire. */
export const COMMUNES_NAV = [
  { href: "/communes/le-grau-du-roi", label: "Le Grau-du-Roi" },
  { href: "/communes/aigues-mortes", label: "Aigues-Mortes" },
  { href: "/communes/la-grande-motte", label: "La Grande-Motte" },
  { href: "/communes/saint-laurent-d-aigouze", label: "Saint-Laurent-d'Aigouze" },
  { href: "/communes/marsillargues", label: "Marsillargues" },
  { href: "/communes/lunel", label: "Lunel" },
  { href: "/communes/vauvert", label: "Vauvert" },
] as const;

/** Lien actif : même chemin ou sous-page. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
