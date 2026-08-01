import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { BusinessRow } from "@/components/businesses/business-row";
import { BusinessesMap } from "@/components/businesses/businesses-map";
import { GastronomieFilters } from "@/components/businesses/gastronomie-filters";
import { DirectoryFeatured } from "@/components/businesses/directory-featured";
import { CollapsibleMap } from "@/components/ui/collapsible-map";
import { Pagination } from "@/components/ui/pagination";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Gastronomie — geoclicMédia",
  description:
    "Restaurants, bars, glaciers et producteurs du littoral camarguais. Trouvez une table par envie : pizzeria, fruits de mer, tapas, vue mer…",
};

type Props = {
  searchParams: Promise<{
    page?: string;
    specialty?: string;
    commune?: string;
  }>;
};

export default async function GastronomiePage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [businesses, communes] = await Promise.all([
    api.businesses.list({
      page,
      // Section autonome : la branche gastronomie est forcee ici, jamais
      // exposee dans l'URL. L'API matche toute la descendance.
      category: "gastronomie",
      specialty: sp.specialty,
      commune: sp.commune,
    }),
    api.communes(),
  ]);

  const geoCount = businesses.results.filter(
    (b) => b.latitude !== null && b.longitude !== null,
  ).length;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Gastronomie
        </h1>
        <p className="text-sm text-slate-500">{businesses.count} tables</p>
      </header>

      <GastronomieFilters
        communes={communes}
        values={{ specialty: sp.specialty, commune: sp.commune }}
      />

      {/* Table a la une (emplacement premium monétisé, scopé gastronomie) */}
      <DirectoryFeatured communeSlug={sp.commune} categorySlug="gastronomie" />

      {/* Carte d'ensemble — visible mais repliable par l'utilisateur */}
      {geoCount > 0 ? (
        <CollapsibleMap count={geoCount}>
          <BusinessesMap businesses={businesses.results} />
        </CollapsibleMap>
      ) : null}

      {businesses.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">
            Aucune table ne correspond à cette envie pour l&apos;instant.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Essayez une autre envie, ou{" "}
            <Link
              href="/gastronomie"
              className="text-[#1a4d6e] underline hover:text-[#a8533a]"
            >
              réinitialisez les filtres
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {businesses.results.map((b) => (
              <BusinessRow key={b.id} business={b} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalCount={businesses.count}
            pageSize={20}
            baseUrl={
              sp.specialty || sp.commune
                ? `/gastronomie?${new URLSearchParams({
                    ...(sp.specialty ? { specialty: sp.specialty } : {}),
                    ...(sp.commune ? { commune: sp.commune } : {}),
                  }).toString()}`
                : "/gastronomie"
            }
          />
        </>
      )}
    </div>
  );
}
