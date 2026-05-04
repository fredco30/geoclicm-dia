import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import { Pagination } from "@/components/ui/pagination";

export const revalidate = 600;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const cat = await api.category(slug);
    return {
      title: cat.name,
      description: cat.description || `Articles dans la catégorie ${cat.name}.`,
    };
  } catch {
    return { title: "Catégorie introuvable" };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let category, articles;
  try {
    [category, articles] = await Promise.all([
      api.category(slug),
      api.articles.list({ category: slug, page }),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {category.name}
          </h1>
        </div>
        {category.description ? (
          <p className="mt-3 max-w-2xl text-slate-600">{category.description}</p>
        ) : null}
      </header>

      {articles.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun article dans cette catégorie pour l&apos;instant.
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
            baseUrl={`/categories/${slug}`}
          />
        </>
      )}
    </div>
  );
}
