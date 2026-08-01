import Link from "next/link";
import { Compass, MapPin } from "lucide-react";
import type { PlaceListItem } from "@/types/api";

/**
 * Ligne dense d'un lieu (mobile-first) : vignette image carrée + titre +
 * catégorie/commune. 5 à 6 items visibles par écran mobile.
 */
export function PlaceRow({ place }: { place: PlaceListItem }) {
  return (
    <Link
      href={`/decouvrir/${place.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#1a4d6e] hover:shadow-sm"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {place.cover_image?.thumbnail || place.cover_image?.medium ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.cover_image.thumbnail ?? place.cover_image.medium ?? ""}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Compass className="h-5 w-5 text-[#1a4d6e]/50" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:whitespace-normal">
          {place.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
          <span
            className="rounded-full px-1.5 py-px text-[10px] font-medium text-white"
            style={{ backgroundColor: place.category.color }}
          >
            {place.category.name}
          </span>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{place.commune_name}</span>
        </span>
      </span>
    </Link>
  );
}
