import Link from "next/link";
import { MapPin } from "lucide-react";
import type { BusinessListItem } from "@/types/api";

type Props = {
  business: BusinessListItem;
};

export function BusinessCard({ business }: Props) {
  const isPremium = business.plan === "premium";

  return (
    <Link
      href={`/commerces/${business.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-[#a8533a] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {business.logo?.medium ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo.medium}
            alt={business.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="font-serif text-3xl text-slate-400">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {isPremium ? (
          <span className="absolute right-2 top-2 rounded-full bg-[#a8533a] px-2 py-0.5 text-xs font-medium text-white">
            ★ Partenaire
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
          {business.category_name}
        </div>
        <h3 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-[#1a4d6e]">
          {business.name}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3" />
          <span>{business.commune_name}</span>
          {business.city && business.city !== business.commune_name ? (
            <span className="text-slate-400">— {business.city}</span>
          ) : null}
          {business.service_areas_count > 0 ? (
            <span className="text-slate-400">
              {" "}
              + {business.service_areas_count}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
