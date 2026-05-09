import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-server";
import { ArticleCategoryForm } from "@/components/admin/article-category-form";

export default async function NewArticleCategoryPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  return <ArticleCategoryForm />;
}
