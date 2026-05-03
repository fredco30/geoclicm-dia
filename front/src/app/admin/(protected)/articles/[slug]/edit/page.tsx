import { notFound } from "next/navigation";
import { getCookieHeader } from "@/lib/auth-server";
import { api } from "@/lib/api";
import { ArticleForm } from "@/components/admin/article-form";
import type { ArticleDetail } from "@/types/api";

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

export default async function EditArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, categories, communes] = await Promise.all([
    fetchArticleAuth(slug),
    api.categories(),
    api.communes(),
  ]);
  if (!article) notFound();

  return (
    <ArticleForm article={article} categories={categories} communes={communes} />
  );
}
