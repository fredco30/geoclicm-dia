import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { BusinessForm } from "@/components/admin/business-form";
import type { Commune } from "@/types/api";
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

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

function sortCategoriesForSelect(
  cats: AdminBusinessCategory[],
): AdminBusinessCategory[] {
  // Tri : racines d'abord (par sort_order), puis enfants groupés sous leur parent.
  const sortFn = (a: AdminBusinessCategory, b: AdminBusinessCategory) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  const roots = cats.filter((c) => c.parent === null).sort(sortFn);
  const childrenByParent = new Map<number, AdminBusinessCategory[]>();
  for (const c of cats) {
    if (c.parent !== null) {
      const list = childrenByParent.get(c.parent) ?? [];
      list.push(c);
      childrenByParent.set(c.parent, list);
    }
  }
  for (const list of childrenByParent.values()) list.sort(sortFn);
  const result: AdminBusinessCategory[] = [];
  for (const root of roots) {
    result.push(root);
    for (const child of childrenByParent.get(root.id) ?? []) {
      result.push(child);
    }
  }
  return result;
}

export default async function NewBusinessPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const [categories, communes] = await Promise.all([
    fetchCategories(),
    fetchCommunes(),
  ]);

  return (
    <BusinessForm
      categories={sortCategoriesForSelect(categories)}
      communes={communes}
    />
  );
}
