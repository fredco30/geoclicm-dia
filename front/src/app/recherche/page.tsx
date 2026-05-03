import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";

export const dynamic = "force-dynamic"; // recherche = toujours fraîche

export const metadata: Metadata = {
  title: "Recherche",
  description:
    "Rechercher dans les articles de geoclicMédia : actualités, patrimoine, traditions du littoral camarguais.",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const data = query ? await api.search(query).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Rechercher
        </h1>

        <form
          action="/recherche"
          method="GET"
          className="mt-4 flex max-w-xl items-center gap-2"
        >
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Rechercher un article, un thème, un lieu..."
              className="h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-[#1a4d6e] focus:outline-none focus:ring-2 focus:ring-[#1a4d6e]/20"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-md bg-[#1a4d6e] px-4 text-sm font-medium text-white hover:bg-[#133a55]"
          >
            Rechercher
          </button>
        </form>
      </header>

      {!query ? (
        <p className="text-slate-500">
          Tape un mot-clé ci-dessus pour explorer les articles.
        </p>
      ) : data === null ? (
        <p className="text-amber-700">
          La recherche a échoué. Réessaie dans un instant.
        </p>
      ) : data.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucun résultat pour <strong>« {query} »</strong>.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600">
            {data.count} résultat{data.count > 1 ? "s" : ""} pour <strong>« {query} »</strong>.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
