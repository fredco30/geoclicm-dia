import Link from "next/link";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { getCookieHeader } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { AdminBusinessListItem } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchMyBusinesses(): Promise<AdminBusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/advertiser/businesses/?ordering=name`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminBusinessListItem>;
  return data.results;
}

export default async function MyBusinessesPage() {
  const businesses = await fetchMyBusinesses();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">
          Mes fiches commerce
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({businesses.length})
          </span>
        </h1>
        <Link href="/advertiser/fiches/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle fiche
          </Button>
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Tu n&apos;as pas encore de fiche commerce.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Crée ta première fiche pour apparaître dans l&apos;annuaire et sur
            la carte du territoire.
          </p>
          <Link href="/advertiser/fiches/new" className="mt-4 inline-block">
            <Button size="md">
              <Plus className="h-4 w-4" /> Créer ma fiche
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Mis à jour</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {businesses.map((b) => (
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
                      <div className="font-medium text-slate-900">{b.name}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{b.category_name}</td>
                  <td className="px-3 py-2 text-slate-600">{b.commune_name}</td>
                  <td className="px-3 py-2">
                    {b.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <Eye className="h-3 w-3" /> En ligne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        <EyeOff className="h-3 w-3" /> En attente de validation
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(b.updated_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/advertiser/fiches/${b.slug}/edit`}
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
