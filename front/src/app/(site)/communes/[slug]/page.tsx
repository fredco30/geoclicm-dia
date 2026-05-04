import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import { Pagination } from "@/components/ui/pagination";
import { BusinessFeaturedSection } from "@/components/businesses/business-featured-section";

export const revalidate = 600;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const c = await api.commune(slug);
    return {
      title: c.name,
      description:
        c.short_description ||
        c.description ||
        `Articles concernant ${c.name} (${c.insee_code}).`,
    };
  } catch {
    return { title: "Commune introuvable" };
  }
}

export default async function CommunePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let commune, articles, businessesData;
  try {
    [commune, articles, businessesData] = await Promise.all([
      api.commune(slug),
      api.articles.list({ commune: slug, page }),
      api.businesses
        .list({ area: slug, ordering: "-is_featured,name" })
        .catch(() => null),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const territoryBusinesses = (businessesData?.results ?? []).slice(0, 8);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          {commune.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          INSEE {commune.insee_code} · département {commune.department}
          {commune.intercommunalite ? ` · ${commune.intercommunalite}` : ""}
        </p>
        {commune.short_description ? (
          <p className="mt-3 max-w-2xl text-slate-600">{commune.short_description}</p>
        ) : null}
      </header>

      {articles.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun article publié sur {commune.name} pour l&apos;instant.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.results.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalCount={articles.count}
            pageSize={20}
            baseUrl={`/communes/${slug}`}
          />
        </>
      )}

      {/* Encart commerçants du territoire (siège ou zone desservie) */}
      <BusinessFeaturedSection
        title={`Commerces de ${commune.name}`}
        subtitle="Acteurs locaux installés ou intervenant sur ce territoire."
        businesses={territoryBusinesses}
        seeAllHref={`/commerces?commune=${slug}`}
        seeAllLabel={`Voir tous les commerces de ${commune.name}`}
      />
    </div>
  );
}
