import Link from "next/link";
import { Plus, Edit, Eye } from "lucide-react";
import { getCookieHeader } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/articles/category-badge";
import { formatDate } from "@/lib/utils";
import type { ArticleListItem, Paginated } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchAllArticles(): Promise<ArticleListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/articles/?ordering=-created_at`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<ArticleListItem>;
  return data.results;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-slate-200 text-slate-700" },
  scheduled: { label: "Programmé", cls: "bg-amber-100 text-amber-800" },
  published: { label: "Publié", cls: "bg-green-100 text-green-800" },
  archived: { label: "Archivé", cls: "bg-slate-100 text-slate-500" },
};

export default async function AdminDashboard() {
  const articles = await fetchAllArticles();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Articles{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({articles.length})
          </span>
        </h1>
        <Link href="/admin/articles/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvel article
          </Button>
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Aucun article pour l&apos;instant.{" "}
          <Link
            href="/admin/articles/new"
            className="font-medium text-[#1a4d6e] underline"
          >
            Créer le premier
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Publié le</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {articles.map((a) => {
                const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.draft;
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        {a.cover_image?.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.cover_image.thumbnail}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-slate-200" />
                        )}
                        <div className="font-medium text-slate-900">{a.title}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <CategoryBadge category={a.category} />
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {a.commune || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {formatDate(a.published_at) || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          href={`/articles/${a.slug}`}
                          target="_blank"
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                          aria-label="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/articles/${a.slug}/edit`}
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                          aria-label="Éditer"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
