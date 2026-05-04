import { getCookieHeader } from "@/lib/auth-server";
import { api } from "@/lib/api";
import { ArticleForm } from "@/components/admin/article-form";
import type { BusinessListItem, Paginated } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

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

export default async function NewArticlePage() {
  const [categories, communes, businesses] = await Promise.all([
    api.categories(),
    api.communes(),
    fetchBusinessesAuth(),
  ]);

  return (
    <ArticleForm
      categories={categories}
      communes={communes}
      businesses={businesses}
    />
  );
}
