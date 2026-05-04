import Link from "next/link";
import type { ArticleListItem } from "@/types/api";
import { CategoryBadge } from "./category-badge";
import { formatDate } from "@/lib/utils";

export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl">
      <Link href={`/articles/${article.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {article.cover_image?.medium ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.cover_image.medium}
              alt={article.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c6a93] to-[#1a4d6e]" />
          )}
          {article.sponsor ? (
            <span className="absolute right-2 top-2 rounded-full bg-[#a8533a] px-2 py-0.5 text-xs font-medium text-white shadow-sm">
              Sponsorisé
            </span>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <CategoryBadge category={article.category} />
          {article.commune ? (
            <span className="text-slate-500">· {article.commune}</span>
          ) : null}
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-xl">
          <Link
            href={`/articles/${article.slug}`}
            className="after:absolute after:inset-0 hover:text-[#1a4d6e]"
          >
            {article.title}
          </Link>
        </h3>
        {article.chapeau ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
            {article.chapeau}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-slate-500">
          <span>{article.author.full_name}</span>
          {article.published_at ? (
            <>
              <span>·</span>
              <time dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
