import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { BusinessRow } from "@/components/businesses/business-row";
import { BusinessesMap } from "@/components/businesses/businesses-map";
import { BusinessFilters } from "@/components/businesses/business-filters";
import { DirectoryFeatured } from "@/components/businesses/directory-featured";
import { CollapsibleMap } from "@/components/ui/collapsible-map";
import { Pagination } from "@/components/ui/pagination";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Commerces du territoire — geoclicMédia",
  description:
    "Annuaire des commerçants du littoral camarguais : restaurants, hébergements, artisans, services. Découvrez les acteurs locaux du Grau-du-Roi à Lunel.",
};

type Props = {
  searchParams: Promise<{
    page?: string;
    category?: string;
    commune?: string;
  }>;
};

export default async function BusinessesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [businesses, categories, communes] = await Promise.all([
    api.businesses.list({
      page,
      category: sp.category,
      commune: sp.commune,
    }),
    api.businessCategories(),
    api.communes(),
  ]);

  const geoCount = businesses.results.filter(
    (b) => b.latitude !== null && b.longitude !== null,
  ).length;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Commerces
        </h1>
        <p className="text-sm text-slate-500">{businesses.count} adresses</p>
      </header>

      <BusinessFilters
        categories={categories}
        communes={communes}
        values={{ category: sp.category, commune: sp.commune }}
      />

      {/* Commerçant à la une (emplacement premium monétisé) */}
      <DirectoryFeatured communeSlug={sp.commune} categorySlug={sp.category} />

      {/* Carte d'ensemble — visible mais repliable par l'utilisateur */}
      {geoCount > 0 ? (
        <CollapsibleMap count={geoCount}>
          <BusinessesMap businesses={businesses.results} />
        </CollapsibleMap>
      ) : null}

      {businesses.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">
            Aucun commerce ne correspond à ces critères pour l&apos;instant.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            L&apos;annuaire s&apos;étoffe au fil de la saison —{" "}
            <Link
              href="/contact"
              className="text-[#1a4d6e] underline hover:text-[#a8533a]"
            >
              vous êtes commerçant ? Contactez-nous
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
              sp.category || sp.commune
                ? `/commerces?${new URLSearchParams({
                    ...(sp.category ? { category: sp.category } : {}),
                    ...(sp.commune ? { commune: sp.commune } : {}),
                  }).toString()}`
                : "/commerces"
            }
          />
        </>
      )}
    </div>
  );
}
