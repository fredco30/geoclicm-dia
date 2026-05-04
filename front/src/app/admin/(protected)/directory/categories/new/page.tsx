import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { BusinessCategoryForm } from "@/components/admin/business-category-form";
import type { AdminBusinessCategory } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCategories(): Promise<AdminBusinessCategory[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/business-categories/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminBusinessCategory[];
}

export default async function NewCategoryPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const allCategories = await fetchCategories();
  const parents = allCategories
    .filter((c) => c.parent === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return <BusinessCategoryForm parents={parents} />;
}
