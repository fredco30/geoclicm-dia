import Link from "next/link";
import { Banknote, Briefcase, Building2, MapPin } from "lucide-react";
import type { ListingListItem } from "@/types/api";

export function ListingCard({ listing, basePath }: { listing: ListingListItem; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${listing.slug}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#1a4d6e] px-2 py-0.5 text-xs font-medium text-white">
        <Briefcase className="h-3 w-3" /> {listing.category.name}
      </span>
      <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 group-hover:text-[#1a4d6e]">
        {listing.title}
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {listing.employer_or_agency ? (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> {listing.employer_or_agency}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {listing.commune_name ?? listing.locality ?? "Territoire"}
        </span>
        {listing.price ? (
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" /> {listing.price}
          </span>
        ) : null}
        {listing.contract_type ? <span>{listing.contract_type}</span> : null}
      </p>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
        {listing.short_description}
      </p>
    </Link>
  );
}
