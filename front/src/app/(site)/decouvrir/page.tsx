import type { Metadata } from "next";
import { PlaceRow } from "@/components/discovery/place-row";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Découvrir le territoire",
  description: "Patrimoine, nature, plages, balades et savoir-faire du littoral camarguais.",
};

type Props = { searchParams: Promise<{ page?: string; category?: string; commune?: string }> };

export default async function DiscoveryPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [places, categories, communes] = await Promise.all([
    api.discovery.list({ page, category: params.category, commune: params.commune }),
    api.discovery.categories(),
    api.communes(),
  ]);
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.commune) query.set("commune", params.commune);
  const baseUrl = query.size ? `/decouvrir?${query}` : "/decouvrir";

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Découvrir
        </h1>
        <p className="text-sm text-slate-500">{places.count} lieux</p>
      </header>

      <DiscoveryFilters
        categories={categories}
        communes={communes}
        values={{ category: params.category, commune: params.commune }}
      />

      {places.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Aucun lieu publié pour ces critères.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {places.results.map((place) => (
              <PlaceRow key={place.id} place={place} />
            ))}
          </div>
          <Pagination currentPage={page} totalCount={places.count} pageSize={20} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}
