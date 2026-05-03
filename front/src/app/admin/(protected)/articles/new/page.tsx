import { api } from "@/lib/api";
import { ArticleForm } from "@/components/admin/article-form";

export default async function NewArticlePage() {
  const [categories, communes] = await Promise.all([
    api.categories(),
    api.communes(),
  ]);

  return <ArticleForm categories={categories} communes={communes} />;
}
