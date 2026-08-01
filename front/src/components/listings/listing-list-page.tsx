import type { Metadata } from "next";
import { ListingRow } from "@/components/listings/listing-row";
import { ListingFilters } from "@/components/listings/listing-filters";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

type Props = {
  searchParams: Promise<{ page?: string; commune?: string }>;
};

export function makeListingListPage(config: {
  categorySlug: string;
  basePath: string;
  title: string;
  description: string;
  emptyLabel: string;
}) {
  const { categorySlug, basePath, title, emptyLabel } = config;

  async function ListingListPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Math.max(1, Number(params.page) || 1);
    const [listings, communes] = await Promise.all([
      api.listings.list({ page, category: categorySlug, commune: params.commune }),
      api.communes(),
    ]);
    const query = new URLSearchParams();
    if (params.commune) query.set("commune", params.commune);
    const baseUrl = query.size ? `${basePath}?${query}` : basePath;
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-slate-500">{listings.count} annonces</p>
        </header>
        <ListingFilters basePath={basePath} communes={communes} values={{ commune: params.commune }} />
        {listings.results.length ? (
          <>
            <div className="flex flex-col gap-2">
              {listings.results.map((listing) => (
                <ListingRow key={listing.id} listing={listing} basePath={basePath} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalCount={listings.count}
              pageSize={20}
              baseUrl={baseUrl}
            />
          </>
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-slate-500">
            {emptyLabel}
          </p>
        )}
      </div>
    );
  }

  return ListingListPage;
}

export function listingMetadata(title: string, description: string): Metadata {
  return { title, description };
}
