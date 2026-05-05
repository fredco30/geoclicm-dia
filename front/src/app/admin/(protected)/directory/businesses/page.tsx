import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Eye, EyeOff, Star, UserCheck, UserX } from "lucide-react";
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

type ClaimedFilter = "all" | "claimed" | "unclaimed";

async function fetchBusinesses(
  filter: ClaimedFilter,
): Promise<AdminBusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const params = new URLSearchParams({ ordering: "name", page_size: "200" });
  if (filter === "claimed") params.set("is_claimed", "true");
  if (filter === "unclaimed") params.set("is_claimed", "false");
  const res = await fetch(`${API_URL}/api/businesses/?${params.toString()}`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminBusinessListItem>;
  return data.results;
}

type Props = {
  searchParams: Promise<{ claimed?: string }>;
};

export default async function BusinessesPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const sp = await searchParams;
  const filter: ClaimedFilter =
    sp.claimed === "true"
      ? "claimed"
      : sp.claimed === "false"
        ? "unclaimed"
        : "all";

  const businesses = await fetchBusinesses(filter);

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

      {/* Filtres : tabs Toutes / Réclamées / Non réclamées */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <FilterTab href="/admin/directory/businesses" active={filter === "all"}>
          Toutes
        </FilterTab>
        <FilterTab
          href="/admin/directory/businesses?claimed=true"
          active={filter === "claimed"}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Réclamées
        </FilterTab>
        <FilterTab
          href="/admin/directory/businesses?claimed=false"
          active={filter === "unclaimed"}
        >
          <UserX className="h-3.5 w-3.5" />
          Non réclamées
        </FilterTab>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            {filter === "all"
              ? "Aucun commerçant pour l'instant."
              : filter === "claimed"
                ? "Aucune fiche réclamée pour l'instant."
                : "Aucune fiche non réclamée — toutes sont rattachées à un compte."}
          </p>
          {filter === "all" ? (
            <p className="mt-1 text-xs text-slate-500">
              Crée la première fiche en cliquant sur « Nouveau commerçant ».
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Propriétaire</th>
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
                    <td className="px-3 py-2 text-slate-600">
                      {b.commune_name}
                      {b.service_areas_count > 0 ? (
                        <span className="ml-1 text-xs text-slate-400">
                          + {b.service_areas_count}{" "}
                          {b.service_areas_count > 1 ? "zones" : "zone"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <OwnerCell
                        ownerId={b.owner}
                        ownerUsername={b.owner_username}
                        isClaimed={b.is_claimed}
                      />
                    </td>
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

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition " +
        (active
          ? "bg-[#1a4d6e] text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-[#1a4d6e]")
      }
    >
      {children}
    </Link>
  );
}

function OwnerCell({
  ownerId,
  ownerUsername,
  isClaimed,
}: {
  ownerId: number | null;
  ownerUsername: string | null;
  isClaimed: boolean;
}) {
  // Cas : fiche réclamée par un user (lien direct vers son compte).
  if (ownerId && ownerUsername) {
    return (
      <Link
        href={`/admin/settings/users/${ownerId}/edit`}
        className="inline-flex items-center gap-1.5 text-sm text-[#1a4d6e] hover:underline"
        title="Voir le compte propriétaire"
      >
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        @{ownerUsername}
      </Link>
    );
  }

  // Cas exotique : is_claimed=true mais owner null (incohérence DB possible
  // après suppression d'un user en SET_NULL — on signale visuellement).
  if (isClaimed) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        title="Fiche marquée réclamée mais sans propriétaire (compte supprimé ?)"
      >
        <UserX className="h-3 w-3" aria-hidden />
        Sans propriétaire
      </span>
    );
  }

  // Cas standard phase pilote : fiche saisie par l'admin, en attente d'être
  // réclamée par un commerçant qui s'inscrira plus tard en self-service.
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
      title="Aucun compte annonceur associé — fiche gérée par l'équipe"
    >
      <UserX className="h-3 w-3" aria-hidden />
      Non réclamée
    </span>
  );
}
