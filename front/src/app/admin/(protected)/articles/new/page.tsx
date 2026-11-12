import { fetchAllPages } from "@/lib/auth-server";
import { api } from "@/lib/api";
import { getSiteSettings } from "@/lib/site-settings";
import { ArticleForm } from "@/components/admin/article-form";
import type { BusinessListItem } from "@/types/api";

async function fetchBusinessesAuth(): Promise<BusinessListItem[]> {
  return (await fetchAllPages<BusinessListItem>("/api/businesses/?ordering=name")) ?? [];
}

export default async function NewArticlePage() {
  const [site, categories, communes, businesses] = await Promise.all([
    getSiteSettings(),
    api.categories(),
    api.communes(),
    fetchBusinessesAuth(),
  ]);

  return (
    <ArticleForm
      categories={categories}
      communes={communes}
      businesses={businesses}
      facebookEnabled={site.facebook_enabled}
    />
  );
}
