import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Eye, EyeOff, Star } from "lucide-react";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { AdminBusinessListItem } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

const PLAN_LABELS: Record<string, { label: string; className: string }> = {
  free: { label: "Gratuit", className: "bg-slate-100 text-slate-700" },
  basic: { label: "Basic", className: "bg-blue-100 text-blue-800" },
  premium: { label: "Premium", className: "bg-amber-100 text-amber-900" },
};

async function fetchBusinesses(): Promise<AdminBusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/businesses/?ordering=name`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminBusinessListItem>;
  return data.results;
}

export default async function BusinessesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const businesses = await fetchBusinesses();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Commerçants{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({businesses.length})
          </span>
        </h1>
        <Link href="/admin/directory/businesses/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouveau commerçant
          </Button>
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucun commerçant pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Crée la première fiche en cliquant sur « Nouveau commerçant ».
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Mis à jour</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {businesses.map((b) => {
                const plan = PLAN_LABELS[b.plan] ?? PLAN_LABELS.free;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {b.logo?.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logo.thumbnail}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100" />
                        )}
                        <div>
                          <div className="font-medium text-slate-900">
                            {b.name}
                            {b.is_featured ? (
                              <Star className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">{b.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{b.category_name}</td>
                    <td className="px-3 py-2 text-slate-600">{b.commune_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.className}`}
                      >
                        {plan.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs">
                        {b.is_published ? (
                          <>
                            <Eye className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-green-700">Publiée</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-500">Brouillon</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatDate(b.updated_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/directory/businesses/${b.slug}/edit`}
                        className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                        aria-label="Éditer"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
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
