import Link from "next/link";
import { redirect } from "next/navigation";
import { Edit, Eye, EyeOff, Plus } from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import type { AdminArticleCategory } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCategories(): Promise<AdminArticleCategory[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/categories/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminArticleCategory[];
}

export default async function ArticleCategoriesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const categories = await fetchCategories();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Catégories d&apos;articles{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({categories.length})
          </span>
        </h1>
        <Link href="/admin/articles/categories/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </Button>
        </Link>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Les catégories servent à classer les articles éditoriaux. Elles
        apparaissent sur les pages <code>/categories/&lt;slug&gt;</code> et
        sont liées aux <strong>tuiles d&apos;accueil</strong> qui pointent
        vers ces URLs (ex : Tribune libre, Bons plans).
      </p>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune catégorie pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Suggestion : commencer par les rubriques que tu vises sur la home
            (ex : « Tribune libre », « Bons plans », « Reportages »…).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Slug (URL)</th>
                <th className="px-3 py-2">Couleur</th>
                <th className="px-3 py-2">Icône</th>
                <th className="px-3 py-2 text-right">Articles</th>
                <th className="px-3 py-2">Ordre</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {c.name}
                    {c.description ? (
                      <p className="mt-0.5 text-xs font-normal text-slate-500 line-clamp-1">
                        {c.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                      /{c.slug}
                    </code>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: c.color }}
                        aria-hidden
                      />
                      <code className="text-xs text-slate-500">{c.color}</code>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                      {c.icon || "—"}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {c.article_count}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{c.sort_order}</td>
                  <td className="px-3 py-2">
                    {c.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/articles/categories/${c.slug}/edit`}
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
      )}
    </div>
  );
}
