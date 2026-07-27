import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import { Pagination } from "@/components/ui/pagination";
import { CommuneChips } from "@/components/communes/commune-chips";
import { UneCarousel } from "@/components/home/une-carousel";
import { SearchTrigger } from "@/components/home/search-trigger";
import { TileGrid } from "@/components/tiles/tile-grid";

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
        `Actualités, commerçants et infos pratiques de ${c.name}.`,
    };
  } catch {
    return { title: "Commune introuvable" };
  }
}

/**
 * Page commune v2 — pattern « city » :
 *  1. Header avec retour Accueil et identité commune
 *  2. Sélecteur de communes (chips) pour basculer rapidement
 *  3. Bandeau "À la une" filtré sur la commune
 *  4. Barre de recherche/IA (stub vers /recherche, drawer en PR 7)
 *  5. Grille de tuiles filtrées sur la commune
 *  6. Liste paginée des articles de la commune (SEO + navigation longue)
 */
export default async function CommunePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let commune, communes, articles, tiles;
  try {
    [commune, communes, articles, tiles] = await Promise.all([
      api.commune(slug),
      api.communes(),
      api.articles.list({ commune: slug, page }),
      api.tiles.list({ commune: slug }).catch(() => []),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const sortedCommunes = [...communes].sort((a, b) => a.sort_order - b.sort_order);

  // Articles pour le bandeau Une : 5 max, featured d'abord
  const articlesUne = [
    ...articles.results.filter((a) => a.is_featured),
    ...articles.results.filter((a) => !a.is_featured),
  ].slice(0, 5);

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-4 sm:py-8">
      <header>
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {commune.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          INSEE {commune.insee_code} · département {commune.department}
          {commune.intercommunalite ? ` · ${commune.intercommunalite}` : ""}
        </p>
        {commune.short_description ? (
          <p className="mt-2 max-w-2xl text-slate-600">{commune.short_description}</p>
        ) : null}
      </header>

      <CommuneChips
        communes={sortedCommunes}
        activeSlug={commune.slug}
        linkPrefix="/communes"
      />

      <UneCarousel articles={articlesUne} />

      <SearchTrigger />

      <TileGrid tiles={tiles} />

      {/* Liste paginée des articles de la commune (SEO + navigation longue) */}
      {articles.count > 0 ? (
        <section className="pt-2">
          <h2 className="mb-4 font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
            Tous les articles de {commune.name}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aucun article publié sur {commune.name} pour l&apos;instant.
        </div>
      )}
    </div>
  );
}
