import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, User } from "lucide-react";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { ArticleBody } from "@/components/articles/article-body";
import { CategoryBadge } from "@/components/articles/category-badge";
import { ShareButtons } from "@/components/articles/share-buttons";
import { formatDate } from "@/lib/utils";
import type { ArticleDetail } from "@/types/api";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let article: ArticleDetail;
  try {
    article = await api.articles.detail(slug);
  } catch {
    return { title: "Article introuvable" };
  }
  const description = article.meta_description || article.chapeau || "";
  const title = article.meta_title || article.title;
  const ogImages = article.cover_image?.large
    ? [{ url: article.cover_image.large, width: 1600, alt: article.title }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: [article.author.full_name],
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.cover_image?.large ? [article.cover_image.large] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  let article: ArticleDetail;
  try {
    article = await api.articles.detail(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const articleUrl = `${siteUrl}/articles/${article.slug}`;

  return (
    <article className="mx-auto max-w-[68ch] px-4 py-6 sm:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-600" aria-label="Fil d'Ariane">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[#1a4d6e]">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </nav>

      {/* En-tête */}
      <header className="mb-10">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
          <CategoryBadge category={article.category} />
          {article.commune ? (
            <Link
              href={`/communes/${article.commune.slug}`}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-[#1a4d6e]"
            >
              <MapPin className="h-3.5 w-3.5" /> {article.commune.name}
            </Link>
          ) : null}
        </div>

        <h1 className="font-serif text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          {article.title}
        </h1>

        {article.chapeau ? (
          <p className="mt-4 text-base leading-relaxed text-slate-700 sm:mt-5 sm:font-serif sm:text-xl sm:italic">
            {article.chapeau}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" /> {article.author.full_name}
          </span>
          {article.published_at ? (
            <time dateTime={article.published_at}>
              Publié le {formatDate(article.published_at)}
            </time>
          ) : null}
          <span>{article.view_count} lectures</span>
        </div>

        {article.sponsor || article.sponsor_disclosure ? (
          <div className="mt-4 flex items-center gap-3 rounded-md bg-[#a8533a]/10 px-4 py-3 ring-1 ring-[#a8533a]/30">
            {article.sponsor?.logo?.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.sponsor.logo.thumbnail}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-[#a8533a]/20"
              />
            ) : (
              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[#a8533a] px-2 text-xs font-medium uppercase tracking-wider text-white">
                Sponsorisé
              </span>
            )}
            <p className="text-sm text-[#7a3a26]">
              {article.sponsor_disclosure || "Contenu en partenariat"}
              {article.sponsor ? (
                <>
                  {" — "}
                  <Link
                    href={`/commerces/${article.sponsor.slug}`}
                    className="font-medium underline hover:text-[#a8533a]"
                  >
                    {article.sponsor.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </header>

      {/* Cover — orientation préservée, hauteur max 600px */}
      {article.cover_image?.large ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_image.large}
          alt={article.title}
          className="mx-auto mb-10 block max-h-[600px] w-auto max-w-full rounded-2xl shadow-sm"
        />
      ) : null}

      {/* Corps */}
      <ArticleBody content={article.body} />

      {/* Tags */}
      {article.tags.length > 0 ? (
        <div className="mt-12 flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <Link
              key={t.id}
              href={`/tags/${t.slug}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Encart sponsor (fin d'article, avant le partage) */}
      {article.sponsor ? (
        <aside className="mt-12 overflow-hidden rounded-xl bg-[#fbf9f5] ring-1 ring-[#a8533a]/30">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            {article.sponsor.logo?.medium ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.sponsor.logo.medium}
                alt={article.sponsor.name}
                className="h-20 w-20 shrink-0 rounded-md object-cover ring-1 ring-slate-200"
              />
            ) : null}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a8533a]">
                En partenariat avec
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                {article.sponsor.name}
              </h2>
              {article.sponsor.short_description ? (
                <p className="mt-1 text-sm text-slate-600">
                  {article.sponsor.short_description}
                </p>
              ) : null}
            </div>
            <Link
              href={`/commerces/${article.sponsor.slug}`}
              className="shrink-0 rounded-md bg-[#a8533a] px-4 py-2 text-sm font-medium text-white hover:bg-[#8e4530]"
            >
              Découvrir
            </Link>
          </div>
        </aside>
      ) : null}

      {/* Partage */}
      <div className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Partager cet article</h2>
        <ShareButtons url={articleUrl} title={article.title} />
      </div>
    </article>
  );
}
