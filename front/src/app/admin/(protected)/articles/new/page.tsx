import { fetchAllPages } from "@/lib/auth-server";
import { api } from "@/lib/api";
import { ArticleForm } from "@/components/admin/article-form";
import type { BusinessListItem } from "@/types/api";

async function fetchBusinessesAuth(): Promise<BusinessListItem[]> {
  return (await fetchAllPages<BusinessListItem>("/api/businesses/?ordering=name")) ?? [];
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
