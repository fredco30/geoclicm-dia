import Link from "next/link";
import { MapPin } from "lucide-react";
import type { BusinessListItem } from "@/types/api";

type Props = {
  business: BusinessListItem;
};

/**
 * Ligne dense d'un commerçant (mobile-first) : logo carré à gauche, nom +
 * catégorie/commune au centre, badge Partenaire à droite. Objectif : 5 à 6
 * items visibles par écran mobile (vs 1 avec la grille de cartes image).
 */
export function BusinessRow({ business }: Props) {
  const isPremium = business.plan === "premium";
  return (
    <Link
      href={`/commerces/${business.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#a8533a] hover:shadow-sm"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {business.logo?.thumbnail || business.logo?.medium ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo.thumbnail ?? business.logo.medium ?? ""}
            alt={business.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-serif text-lg text-slate-400">
            {business.name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:whitespace-normal">
          {business.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
          <span className="text-slate-500">{business.category_name}</span>
          <span aria-hidden>·</span>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{business.commune_name}</span>
        </span>
      </span>
      {isPremium ? (
        <span className="shrink-0 rounded-full bg-[#a8533a] px-2 py-0.5 text-[11px] font-medium text-white">
          ★ Partenaire
        </span>
      ) : null}
    </Link>
  );
}
