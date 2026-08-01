import Link from "next/link";
import { Banknote, Briefcase, Building2, MapPin } from "lucide-react";
import type { ListingListItem } from "@/types/api";

/**
 * Ligne dense d'une annonce (emploi, location, etc.) : chip catégorie + titre
 * + employeur/commune/prix. 5 à 6 items visibles par écran mobile.
 */
export function ListingRow({ listing, basePath }: { listing: ListingListItem; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${listing.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#1a4d6e] hover:shadow-sm"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1a4d6e]/10">
        <Briefcase className="h-5 w-5 text-[#1a4d6e]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:whitespace-normal">
          {listing.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
          {listing.employer_or_agency ? (
            <span className="inline-flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 shrink-0" /> {listing.employer_or_agency}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" /> {listing.commune_name ?? listing.locality ?? "Territoire"}
          </span>
          {listing.price ? (
            <span className="inline-flex items-center gap-1">
              <Banknote className="h-3 w-3 shrink-0" /> {listing.price}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-[#1a4d6e] px-2 py-0.5 text-[11px] font-medium text-white">
        {listing.category.name}
      </span>
    </Link>
  );
}
