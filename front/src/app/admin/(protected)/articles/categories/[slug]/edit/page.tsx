import { notFound, redirect } from "next/navigation";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { ArticleCategoryForm } from "@/components/admin/article-category-form";
import type { AdminArticleCategory } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCategoryBySlug(
  slug: string,
): Promise<AdminArticleCategory | null> {
  // Le ViewSet admin est indexé par id, pas par slug — on récupère la liste
  // courte et on filtre côté serveur. Coût négligeable (< 30 catégories
  // typiquement).
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/categories/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const all = (await res.json()) as AdminArticleCategory[];
  return all.find((c) => c.slug === slug) ?? null;
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EditArticleCategoryPage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { slug } = await params;
  const category = await fetchCategoryBySlug(slug);
  if (!category) notFound();

  return <ArticleCategoryForm category={category} />;
}
