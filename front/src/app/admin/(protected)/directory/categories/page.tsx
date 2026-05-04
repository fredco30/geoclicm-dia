import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit } from "lucide-react";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
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

/** Reconstruit l'arborescence racines → enfants pour affichage indenté. */
function buildTree(
  categories: AdminBusinessCategory[],
): Array<{ cat: AdminBusinessCategory; depth: 0 | 1 }> {
  const sortFn = (a: AdminBusinessCategory, b: AdminBusinessCategory) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);

  const roots = categories.filter((c) => c.parent === null).sort(sortFn);
  const childrenByParent = new Map<number, AdminBusinessCategory[]>();
  for (const c of categories) {
    if (c.parent !== null) {
      const list = childrenByParent.get(c.parent) ?? [];
      list.push(c);
      childrenByParent.set(c.parent, list);
    }
  }
  for (const list of childrenByParent.values()) list.sort(sortFn);

  const out: Array<{ cat: AdminBusinessCategory; depth: 0 | 1 }> = [];
  for (const root of roots) {
    out.push({ cat: root, depth: 0 });
    for (const child of childrenByParent.get(root.id) ?? []) {
      out.push({ cat: child, depth: 1 });
    }
  }
  return out;
}

export default async function CategoriesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const categories = await fetchCategories();
  const tree = buildTree(categories);
  const rootsCount = categories.filter((c) => c.parent === null).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Catégories commerçants{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({rootsCount} racines, {categories.length} au total)
          </span>
        </h1>
        <Link href="/admin/directory/categories/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Icône</th>
              <th className="px-3 py-2">Type schema.org</th>
              <th className="px-3 py-2">Ordre</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tree.map(({ cat, depth }) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div
                    className={
                      depth === 0
                        ? "font-semibold text-slate-900"
                        : "pl-6 text-slate-700"
                    }
                  >
                    {depth === 1 ? "↳ " : null}
                    {cat.name}
                  </div>
                  <div className="text-xs text-slate-400">{cat.slug}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {cat.icon || "—"}
                  </code>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <code className="text-xs">{cat.schema_type}</code>
                </td>
                <td className="px-3 py-2 text-slate-600">{cat.sort_order}</td>
                <td className="px-3 py-2">
                  {cat.is_active ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/directory/categories/${cat.slug}/edit`}
                    className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                    aria-label="Éditer"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
