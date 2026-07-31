import Link from "next/link";
import { Edit, Eye, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCookieHeader } from "@/lib/auth-server";
import { formatDate } from "@/lib/utils";
import type { ListingDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchListings(): Promise<ListingDetail[]> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/admin/listings/`, {
    headers: { Cookie: cookie, Accept: "application/json" },
    cache: "no-store",
  });
  return response.ok ? (response.json() as Promise<ListingDetail[]>) : [];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  expired: "Expirée",
  archived: "Archivée",
};

const PUBLIC_BASE: Record<string, string> = {
  "offres-d-emploi": "/emploi",
  "locations-annuelles": "/locations-annuelles",
};

export default async function ListingsAdminPage() {
  const listings = await fetchListings();
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Annonces</h1>
          <p className="text-sm text-slate-500">
            Offres d&apos;emploi, locations annuelles et autres annonces datées.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/annonces/imports">
            <Button variant="secondary" size="sm">
              Candidats
            </Button>
          </Link>
          <Link href="/admin/annonces/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Nouvelle annonce
            </Button>
          </Link>
        </div>
      </div>
      {listings.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">
          Aucune annonce.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Expire</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{listing.title}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-[#1a4d6e] px-2 py-0.5 text-xs text-white">
                      {listing.category.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {listing.commune_name ?? listing.locality ?? "Territoire"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {listing.expires_at ? formatDate(listing.expires_at) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={listing.status === "published" ? "text-green-700" : "text-slate-500"}>
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {listing.status === "published" ? (
                      <Link
                        href={`${PUBLIC_BASE[listing.category.slug] ?? "/emploi"}/${listing.slug}`}
                        target="_blank"
                        className="inline-block p-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    ) : null}
                    <Link href={`/admin/annonces/${listing.slug}/edit`} className="inline-block p-2">
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
