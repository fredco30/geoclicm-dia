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
    <article className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-slate-600" aria-label="Fil d'Ariane">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[#1a4d6e]">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </nav>

      {/* En-tête */}
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
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

        <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {article.title}
        </h1>

        {article.chapeau ? (
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
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

        {article.sponsor_disclosure ? (
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            <strong>Mention sponsorisée :</strong> {article.sponsor_disclosure}
          </p>
        ) : null}
      </header>

      {/* Cover */}
      {article.cover_image?.large ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_image.large}
          alt={article.title}
          className="mb-10 w-full rounded-2xl shadow-sm"
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

      {/* Partage */}
      <div className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Partager cet article</h2>
        <ShareButtons url={articleUrl} title={article.title} />
      </div>
    </article>
  );
}
