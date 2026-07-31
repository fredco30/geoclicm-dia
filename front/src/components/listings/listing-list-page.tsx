import Link from "next/link";
import type { Metadata } from "next";
import { ListingCard } from "@/components/listings/listing-card";
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
  const { categorySlug, basePath, title, description, emptyLabel } = config;

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
        <header className="mb-8 border-b border-slate-200 pb-6">
          <Link href="/" className="text-sm text-slate-600">
            ← Accueil
          </Link>
          <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
        </header>
        <form className="mb-7 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
          <label className="min-w-48 flex-1 text-xs font-medium text-slate-600">
            Commune
            <select
              name="commune"
              defaultValue={params.commune ?? ""}
              className="mt-1 h-10 w-full rounded-md border px-2 text-sm"
            >
              <option value="">Toutes</option>
              {communes
                .filter((item) => item.is_active)
                .map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="h-10 rounded-md bg-[#1a4d6e] px-4 text-sm font-medium text-white">
            Filtrer
          </button>
          <Link href={basePath} className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline">
            Effacer
          </Link>
        </form>
        {listings.results.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.results.map((listing) => (
                <ListingCard key={listing.id} listing={listing} basePath={basePath} />
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
