import Link from "next/link";

import { CategoryBadge } from "@/components/articles/category-badge";
import type { ArticleListItem } from "@/types/api";

type Props = {
  articles: ArticleListItem[];
};

/**
 * Carrousel "À la une" : 3-5 articles featured / récents en scroll-snap
 * horizontal, mobile-first.
 *
 * Mobile : 1 carte visible à la fois (scroll snap).
 * Desktop : 1 grande carte centrée + aperçu de la suivante (snap-mandatory).
 */
export function UneCarousel({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Les premiers articles arriveront bientôt sur geoclicMédia.
      </div>
    );
  }

  return (
    <section aria-label="À la une">
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {articles.map((a) => (
          <UneCard key={a.id} article={a} />
        ))}
      </div>
      {articles.length > 1 ? (
        <p className="mt-1 text-center text-xs text-slate-400 sm:hidden">
          Faites défiler pour voir les {articles.length - 1}{" "}
          {articles.length > 2 ? "autres articles" : "autre article"}
        </p>
      ) : null}
    </section>
  );
}

function UneCard({ article }: { article: ArticleListItem }) {
  const cover = article.cover_image?.large ?? article.cover_image?.medium;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block w-[88%] shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md sm:w-[64%] md:w-[48%] lg:w-[40%]"
    >
      <div className="relative aspect-[16/10]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover transition group-hover:opacity-95"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d6e] to-[#2c6a93]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <CategoryBadge category={article.category} className="mb-2" />
          <h2 className="font-serif text-xl font-semibold leading-tight drop-shadow sm:text-2xl">
            {article.title}
          </h2>
          {article.chapeau ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-100/95 drop-shadow sm:text-base">
              {article.chapeau}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
