import { notFound } from "next/navigation";
import { getCookieHeader } from "@/lib/auth-server";
import { api } from "@/lib/api";
import { ArticleForm } from "@/components/admin/article-form";
import type {
  ArticleDetail,
  BusinessListItem,
  Paginated,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = { params: Promise<{ slug: string }> };

async function fetchArticleAuth(slug: string): Promise<ArticleDetail | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/articles/${slug}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as ArticleDetail;
}

async function fetchBusinessesAuth(): Promise<BusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/businesses/?ordering=name&page_size=200`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<BusinessListItem>;
  return data.results;
}

export default async function EditArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, categories, communes, businesses] = await Promise.all([
    fetchArticleAuth(slug),
    api.categories(),
    api.communes(),
    fetchBusinessesAuth(),
  ]);
  if (!article) notFound();

  return (
    <ArticleForm
      article={article}
      categories={categories}
      communes={communes}
      businesses={businesses}
    />
  );
}
