import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, ShieldCheck, Shield } from "lucide-react";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { AdminUser } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchUsers(): Promise<AdminUser[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/users/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminUser[];
}

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me?.is_superuser && me?.role !== "admin") {
    redirect("/admin");
  }
  const users = await fetchUsers();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Comptes &amp; droits{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({users.length})
          </span>
        </h1>
        <Link href="/admin/settings/users/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouveau compte
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2">Utilisateur</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Inscrit le</th>
              <th className="px-3 py-2">Dernière connexion</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{u.full_name}</div>
                  <div className="text-xs text-slate-500">@{u.username}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{u.email || "—"}</td>
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
                <td className="px-3 py-2 text-slate-600">
                  {formatDate(u.date_joined)}
                </td>
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
    </div>
  );
}
