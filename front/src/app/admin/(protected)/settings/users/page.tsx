import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, ShieldCheck, Shield, Store, Phone, Mail as MailIcon } from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { UsersTabs } from "@/components/admin/users-tabs";
import { UsersSearchInput } from "@/components/admin/users-search-input";
import { UsersPagination } from "@/components/admin/users-pagination";
import type { Paginated } from "@/types/api";
import type { AdminUser, AdminUserCounts } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const PAGE_SIZE = 50;

const VALID_ROLES = new Set(["", "team", "advertiser", "reader", "inactive"]);
type TabKey = "" | "team" | "advertiser" | "reader" | "inactive";

async function fetchUsers(params: URLSearchParams): Promise<Paginated<AdminUser>> {
  const cookieHeader = await getCookieHeader();
  const qs = params.toString();
  const res = await fetch(`${API_URL}/api/users/${qs ? `?${qs}` : ""}`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    return { count: 0, next: null, previous: null, results: [] };
  }
  return (await res.json()) as Paginated<AdminUser>;
}

async function fetchCounts(): Promise<AdminUserCounts | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/users/counts/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminUserCounts;
}

type Props = {
  searchParams: Promise<{
    role?: string;
    search?: string;
    ordering?: string;
    page?: string;
  }>;
};

export default async function UsersPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me?.is_superuser && me?.role !== "admin") {
    redirect("/admin");
  }

  const sp = await searchParams;
  const rawRole = sp.role ?? "";
  const activeRole: TabKey = (VALID_ROLES.has(rawRole) ? rawRole : "") as TabKey;
  const search = sp.search ?? "";
  const ordering = sp.ordering ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  // Construire l'URL backend
  const apiParams = new URLSearchParams();
  if (activeRole) apiParams.set("role", activeRole);
  if (search) apiParams.set("search", search);
  if (ordering) apiParams.set("ordering", ordering);
  if (page > 1) apiParams.set("page", String(page));

  const [usersData, counts] = await Promise.all([
    fetchUsers(apiParams),
    fetchCounts(),
  ]);

  // Pour la pagination : on conserve les autres searchParams.
  const paginationBase: Record<string, string> = {};
  if (activeRole) paginationBase.role = activeRole;
  if (search) paginationBase.search = search;
  if (ordering) paginationBase.ordering = ordering;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Comptes &amp; droits{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({usersData.count})
          </span>
        </h1>
        <Link href="/admin/settings/users/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouveau compte
          </Button>
        </Link>
      </div>

      <UsersTabs
        activeRole={activeRole}
        counts={counts}
        currentSearch={search}
        currentOrdering={ordering}
      />

      <div className="my-4">
        <UsersSearchInput initialValue={search} />
      </div>

      {usersData.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucun compte trouvé pour ce filtre.
          </p>
          {search ? (
            <p className="mt-1 text-xs text-slate-500">
              Essaye d&apos;élargir la recherche ou de vider le filtre.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Utilisateur</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rôle</th>
                {activeRole === "advertiser" ? (
                  <>
                    <th className="px-3 py-2">Téléphone</th>
                    <th className="px-3 py-2">Fiches</th>
                  </>
                ) : activeRole === "team" ? (
                  <th className="px-3 py-2">Statut</th>
                ) : (
                  <th className="px-3 py-2">Fiches</th>
                )}
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Inscrit le</th>
                <th className="px-3 py-2">Dernière connexion</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usersData.results.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{u.full_name}</div>
                    <div className="text-xs text-slate-500">@{u.username}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {u.email ? (
                      <a
                        href={`mailto:${u.email}`}
                        className="inline-flex items-center gap-1 hover:text-[#1a4d6e]"
                      >
                        <MailIcon className="h-3 w-3 opacity-60" aria-hidden />
                        <span className="truncate">{u.email}</span>
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      {u.is_superuser ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-[#1a4d6e]" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      {getRoleLabel(u)}
                    </span>
                  </td>
                  {activeRole === "advertiser" ? (
                    <>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {u.phone ? (
                          <a
                            href={`tel:${u.phone}`}
                            className="inline-flex items-center gap-1 hover:text-[#1a4d6e]"
                          >
                            <Phone className="h-3 w-3 opacity-60" aria-hidden />
                            {u.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <BusinessesCell userId={u.id} count={u.business_count} />
                      </td>
                    </>
                  ) : activeRole === "team" ? (
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.is_email_verified ? "Email vérifié" : "Email non vérifié"}
                    </td>
                  ) : (
                    <td className="px-3 py-2">
                      <BusinessesCell userId={u.id} count={u.business_count} />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {u.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Désactivé
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(u.date_joined)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(u.last_login) || "Jamais"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/settings/users/${u.id}/edit`}
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

      <UsersPagination
        currentPage={page}
        totalCount={usersData.count}
        pageSize={PAGE_SIZE}
        baseQueryParams={paginationBase}
      />
    </div>
  );
}

function BusinessesCell({ userId, count }: { userId: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-slate-400">— aucune</span>;
  }
  return (
    <Link
      href={`/admin/directory/businesses?owner=${userId}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#1a4d6e]/10 px-2 py-0.5 text-xs font-medium text-[#1a4d6e] hover:bg-[#1a4d6e]/15"
      title="Voir les fiches commerce de ce compte"
    >
      <Store className="h-3 w-3" aria-hidden />
      {count} {count > 1 ? "fiches" : "fiche"}
    </Link>
  );
}
