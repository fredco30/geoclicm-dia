import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { BusinessCard } from "@/components/businesses/business-card";
import type { BusinessListItem } from "@/types/api";

type Props = {
  title: string;
  subtitle?: string;
  businesses: BusinessListItem[];
  /** URL « voir tout » (ex: /commerces ou /commerces?commune=...). */
  seeAllHref: string;
  /** Texte du lien « voir tout ». */
  seeAllLabel?: string;
};

/**
 * Section éditoriale d'encart commerçants — utilisée sur la home et les pages
 * commune. Visuellement distincte des articles éditoriaux par sa couleur
 * d'accent terre cuite (palette commerciale réservée).
 */
export function BusinessFeaturedSection({
  title,
  subtitle,
  businesses,
  seeAllHref,
  seeAllLabel = "Voir tous les commerces",
}: Props) {
  if (businesses.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-14" aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a8533a]">
            <Store className="h-3.5 w-3.5" />
            Annuaire
          </div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href={seeAllHref}
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-[#a8533a] hover:underline sm:inline-flex"
        >
          {seeAllLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>

      <Link
        href={seeAllHref}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#a8533a] hover:underline sm:hidden"
      >
        {seeAllLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
