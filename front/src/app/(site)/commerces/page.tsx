import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { BusinessCard } from "@/components/businesses/business-card";
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

  // Garde uniquement les catégories racines pour le filtre (UX plus simple)
  const rootCategories = categories
    .filter((c) => c.parent === null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeCategory = sp.category
    ? categories.find((c) => c.slug === sp.category)
    : null;
  const activeCommune = sp.commune
    ? communes.find((c) => c.slug === sp.commune)
    : null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Commerces du territoire
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Annuaire des acteurs locaux du littoral camarguais : restaurants,
          hébergements, artisans, services. Soutenez les commerces de proximité.
        </p>
      </header>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <FilterChip
          href="/commerces"
          active={!sp.category && !sp.commune}
          label="Toutes"
        />
        {rootCategories.map((c) => (
          <FilterChip
            key={c.id}
            href={`/commerces?category=${c.slug}`}
            active={sp.category === c.slug}
            label={c.name}
          />
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {communes.map((c) => (
          <FilterChip
            key={c.id}
            href={`/commerces?commune=${c.slug}${sp.category ? `&category=${sp.category}` : ""}`}
            active={sp.commune === c.slug}
            label={c.name}
            small
          />
        ))}
      </div>

      {(activeCategory || activeCommune) && (
        <div className="mb-4 text-sm text-slate-600">
          Filtres actifs :{" "}
          {activeCategory ? (
            <span className="rounded-full bg-slate-200 px-2 py-0.5">
              {activeCategory.name}
            </span>
          ) : null}{" "}
          {activeCommune ? (
            <span className="rounded-full bg-slate-200 px-2 py-0.5">
              {activeCommune.name}
            </span>
          ) : null}
          <Link
            href="/commerces"
            className="ml-2 text-xs text-slate-500 hover:text-[#a8533a]"
          >
            Réinitialiser
          </Link>
        </div>
      )}

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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businesses.results.map((b) => (
              <BusinessCard key={b.id} business={b} />
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

function FilterChip({
  href,
  active,
  label,
  small = false,
}: {
  href: string;
  active: boolean;
  label: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        `rounded-full px-3 py-1 transition ` +
        (active
          ? "bg-[#1a4d6e] text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-[#1a4d6e]") +
        (small ? " text-xs" : "")
      }
    >
      {label}
    </Link>
  );
}
