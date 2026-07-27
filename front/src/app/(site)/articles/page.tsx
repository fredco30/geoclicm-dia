import type { Metadata } from "next";
import Link from "next/link";

import { ArticleCard } from "@/components/articles/article-card";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Actualités locales",
  description:
    "Tous les articles de geoclicMédia sur le littoral camarguais, ses habitants, son patrimoine et ses initiatives locales.",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArticlesPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [articles, categories] = await Promise.all([
    api.articles.list({ page, ordering: "-published_at" }),
    api.categories(),
  ]);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Actualités locales
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Reportages, portraits, mémoire vivante et informations du littoral
          camarguais.
        </p>
      </header>

      <nav aria-label="Catégories d'articles" className="mb-8 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:text-[#1a4d6e] hover:ring-[#1a4d6e]"
          >
            {category.name}
          </Link>
        ))}
      </nav>

      {articles.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun article publié pour l&apos;instant.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.results.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalCount={articles.count}
            pageSize={20}
            baseUrl="/articles"
          />
        </>
      )}
    </div>
  );
}
