import { notFound, redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { BusinessCategoryForm } from "@/components/admin/business-category-form";
import type { AdminBusinessCategory } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = { params: Promise<{ slug: string }> };

async function fetchCategories(): Promise<AdminBusinessCategory[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/business-categories/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminBusinessCategory[];
}

export default async function EditCategoryPage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { slug } = await params;
  const allCategories = await fetchCategories();
  const category = allCategories.find((c) => c.slug === slug);
  if (!category) notFound();

  // Parents disponibles : catégories racines uniquement, en excluant
  // la catégorie en cours d'édition (pour éviter une auto-référence).
  const parents = allCategories
    .filter((c) => c.parent === null && c.id !== category.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return <BusinessCategoryForm category={category} parents={parents} />;
}
