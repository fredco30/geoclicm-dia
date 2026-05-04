import Link from "next/link";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import { CategoryBadge } from "@/components/articles/category-badge";

export const revalidate = 60;

export default async function HomePage() {
  // Récupère articles publiés + catégories en parallèle
  const [articlesData, categories] = await Promise.all([
    api.articles.list({ ordering: "-published_at" }).catch(() => null),
    api.categories().catch(() => []),
  ]);

  const articles = articlesData?.results ?? [];
  const featured = articles.find((a) => a.is_featured) ?? articles[0] ?? null;
  const rest = articles.filter((a) => a.id !== featured?.id);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      {/* HERO À LA UNE — pattern letterbox + blur (préserve toutes orientations) */}
      {featured ? (
        <Link
          href={`/articles/${featured.slug}`}
          className="group block overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md"
        >
          <div className="relative aspect-[16/9] sm:aspect-[2/1]">
            {featured.cover_image?.large ? (
              <>
                {/* Fond : image en cover + blur + dim → ambiance */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.cover_image.large}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-50"
                />
                {/* Avant-plan : image entière en contain, jamais cropée */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.cover_image.large}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-contain transition group-hover:opacity-95"
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d6e] to-[#2c6a93]" />
            )}
            {/* Gradient bas pour lisibilité du titre */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <CategoryBadge category={featured.category} className="mb-3" />
              <h1 className="font-serif text-3xl font-semibold leading-[1.1] tracking-tight drop-shadow-md sm:text-5xl md:text-6xl">
                {featured.title}
              </h1>
              {featured.chapeau ? (
                <p className="mt-3 max-w-2xl font-serif text-base italic text-slate-100 drop-shadow sm:text-lg">
                  {featured.chapeau}
                </p>
              ) : null}
            </div>
          </div>
        </Link>
      ) : (
        <EmptyHero />
      )}

      {/* CATÉGORIES en chips */}
      {categories.length > 0 ? (
        <section className="mt-8" aria-label="Rubriques">
          <h2 className="sr-only">Rubriques</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-[#1a4d6e] hover:text-[#1a4d6e]"
                style={{ borderColor: c.color }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* GRILLE DES DERNIERS ARTICLES */}
      {rest.length > 0 ? (
        <section className="mt-12" aria-label="Derniers articles">
          <h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight text-slate-900">
            Derniers articles
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {articles.length === 0 ? <EmptyState /> : null}
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
      <h1 className="text-2xl font-semibold text-slate-900">geoclicMédia</h1>
      <p className="mt-2">
        Les premiers articles arrivent bientôt. En attendant, l&apos;équipe rédactionnelle prépare une couverture complète du territoire.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      <p>Aucun article publié pour l&apos;instant. Connecte-toi à l&apos;administration pour publier le premier.</p>
    </div>
  );
}
