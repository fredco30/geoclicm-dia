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
    const tag = await api.tag(slug);
    return {
      title: `#${tag.name}`,
      description: `Articles sur le thème « ${tag.name} ».`,
    };
  } catch {
    return { title: "Thème introuvable" };
  }
}

/** Articles portant un mot-clé (lien « #tag » en bas de chaque article). */
export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let tag, articles;
  try {
    [tag, articles] = await Promise.all([
      api.tag(slug),
      api.articles.list({ tag: slug, page }),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/articles" className="text-sm text-slate-600 hover:text-camargue">
          ← Actualités
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          #{tag.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {articles.count} article{articles.count > 1 ? "s" : ""}
        </p>
      </header>

      {articles.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun article sur ce thème pour l&apos;instant.
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
            baseUrl={`/tags/${slug}`}
          />
        </>
      )}
    </div>
  );
}
