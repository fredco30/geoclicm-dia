import Link from "next/link";
import type { Commune } from "@/types/api";

type Props = {
  communes: Commune[];
  activeSlug: string;
  /**
   * Préfixe d'URL pour chaque chip. Le slug de la commune est ajouté
   * derrière. Exemples :
   *  - "/communes" → /communes/le-grau-du-roi
   *  - "/meteo"    → /meteo/le-grau-du-roi
   */
  linkPrefix: string;
  /** Affiche un badge "mer" pour les communes côtières (cf is_coastal). */
  showCoastalBadge?: boolean;
  ariaLabel?: string;
};

/**
 * Chips horizontales sélecteur de commune, scrollables sur mobile.
 *
 * Composant générique réutilisable depuis la page commune (PR 3),
 * la page météo (existant : CommuneSelector dédié), et toute future
 * page contextuelle territoriale.
 */
export function CommuneChips({
  communes,
  activeSlug,
  linkPrefix,
  showCoastalBadge = false,
  ariaLabel = "Choisir une commune",
}: Props) {
  return (
    <nav aria-label={ariaLabel} className="overflow-x-auto">
      <ul className="flex gap-2 pb-1 text-sm">
        {communes.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`${linkPrefix}/${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition " +
                  (active
                    ? "bg-[#1a4d6e] text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-[#1a4d6e]")
                }
              >
                {c.name}
                {showCoastalBadge && c.is_coastal ? (
                  <span
                    aria-hidden
                    className={
                      active
                        ? "rounded bg-white/20 px-1 text-[10px] font-medium"
                        : "rounded bg-cyan-100 px-1 text-[10px] font-medium text-cyan-700"
                    }
                    title="Commune côtière"
                  >
                    mer
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
