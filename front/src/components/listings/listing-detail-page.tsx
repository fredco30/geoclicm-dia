import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Building2, CalendarClock, ExternalLink, FileText, Mail, MapPin, Phone } from "lucide-react";
import { ArticleBody } from "@/components/articles/article-body";
import { ApiError, api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ListingDetail } from "@/types/api";

export function makeListingDetailPage(config: { basePath: string; backLabel: string }) {
  const { basePath, backLabel } = config;

  async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    let listing: ListingDetail;
    try {
      listing = await api.listings.detail((await params).slug);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }
    return (
      <article className="mx-auto max-w-screen-lg px-4 py-6 sm:py-10">
        <Link href={basePath} className="text-sm text-slate-600">
          ← {backLabel}
        </Link>
        <header className="mt-5">
          <span className="rounded-full bg-[#1a4d6e] px-2 py-1 text-xs font-medium text-white">
            {listing.category.name}
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-5xl">{listing.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
            {listing.short_description}
          </p>
        </header>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr),280px]">
          <ArticleBody content={listing.description} />
          <aside className="space-y-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
            <h2 className="font-semibold text-slate-900">Détails</h2>
            {listing.employer_or_agency ? (
              <p className="flex gap-2">
                <Building2 className="h-4 w-4 shrink-0" /> {listing.employer_or_agency}
              </p>
            ) : null}
            <p className="flex gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {listing.address || listing.commune_name || listing.locality || "Territoire"}
            </p>
            {listing.contract_type ? (
              <p className="flex gap-2">
                <FileText className="h-4 w-4 shrink-0" /> {listing.contract_type}
              </p>
            ) : null}
            {listing.price ? (
              <p className="flex gap-2">
                <Banknote className="h-4 w-4 shrink-0" /> {listing.price}
              </p>
            ) : null}
            {listing.expires_at ? (
              <p className="flex gap-2">
                <CalendarClock className="h-4 w-4 shrink-0" /> Avant le {formatDate(listing.expires_at)}
              </p>
            ) : null}
            {listing.contact_phone ? (
              <p className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${listing.contact_phone}`} className="text-[#1a4d6e] underline">
                  {listing.contact_phone}
                </a>
              </p>
            ) : null}
            {listing.contact_email ? (
              <p className="flex gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${listing.contact_email}`} className="text-[#1a4d6e] underline">
                  {listing.contact_email}
                </a>
              </p>
            ) : null}
            {listing.application_url ? (
              <a
                href={listing.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#1a4d6e] underline"
              >
                Voir l&apos;annonce <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {listing.source_url ? (
              <a
                href={listing.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-slate-500 underline"
              >
                Source officielle
              </a>
            ) : null}
          </aside>
        </div>
      </article>
    );
  }

  return ListingDetailPage;
}
