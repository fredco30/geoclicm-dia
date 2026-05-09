import Link from "next/link";
import { redirect } from "next/navigation";
import { Edit, Eye, EyeOff, Plus } from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import type { AdminUsefulContact } from "@/types/admin";
import type { UsefulContactKind } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

const KIND_TABS: { key: UsefulContactKind; label: string; emptyHint: string }[] = [
  {
    key: "useful_number",
    label: "Numéros utiles",
    emptyHint:
      "Suggestion : commencer par les urgences (15, 17, 18, 112, 196 mer) puis les mairies des 7 communes.",
  },
  {
    key: "procedure",
    label: "Démarches",
    emptyHint:
      "Suggestion : ajouter les démarches les plus fréquentes (carte d'identité, état civil, urbanisme).",
  },
];

const TYPE_LABELS: Record<string, string> = {
  phone: "Tél",
  url: "Lien",
  email: "Email",
  address: "Adresse",
  info: "Info",
};

async function fetchContacts(
  kind: UsefulContactKind,
): Promise<AdminUsefulContact[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/admin/utility/contacts/?kind=${kind}`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  return (await res.json()) as AdminUsefulContact[];
}

type Props = {
  searchParams: Promise<{ kind?: string }>;
};

/**
 * Liste des entrées Pratique avec onglets pour basculer entre numéros
 * utiles et démarches.
 *
 * Les entrées sont groupées visuellement par `category_label` pour
 * faciliter la navigation quand la liste grandit.
 */
export default async function UtilityListPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const sp = await searchParams;
  const kindParam = sp.kind === "procedure" ? "procedure" : "useful_number";
  const activeKind: UsefulContactKind = kindParam;

  const contacts = await fetchContacts(activeKind);
  const activeTab = KIND_TABS.find((t) => t.key === activeKind)!;

  // Groupage visuel par category_label
  const groups = new Map<string, AdminUsefulContact[]>();
  for (const c of contacts) {
    const key = c.category_label || "Sans section";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Pratique</h1>
        <Link href={`/admin/utility/new?kind=${activeKind}`}>
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle entrée
          </Button>
        </Link>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Gère les <strong>numéros utiles</strong> (urgences, mairies, services)
        et les <strong>démarches administratives</strong> (carte d&apos;identité,
        état civil, urbanisme). Les entrées sont groupées par section sur les
        pages publiques.
      </p>

      {/* Tabs Numéros utiles / Démarches */}
      <nav aria-label="Type d'entrée" className="mb-4">
        <ul className="flex gap-1 border-b border-slate-200 text-sm">
          {KIND_TABS.map((tab) => {
            const isActive = tab.key === activeKind;
            return (
              <li key={tab.key} className="shrink-0">
                <Link
                  href={`/admin/utility?kind=${tab.key}`}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 transition " +
                    (isActive
                      ? "border-[#1a4d6e] font-semibold text-[#1a4d6e]"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900")
                  }
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune entrée pour l&apos;instant dans « {activeTab.label} ».
          </p>
          <p className="mt-1 text-xs text-slate-500">{activeTab.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([sectionLabel, entries]) => (
            <section
              key={sectionLabel}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                {sectionLabel}{" "}
                <span className="ml-1 font-normal text-slate-500">
                  ({entries.length})
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Libellé</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Valeur</th>
                    <th className="px-3 py-2">Commune</th>
                    <th className="px-3 py-2">Ordre</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entries.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {c.label}
                        {c.description ? (
                          <p className="mt-0.5 text-xs font-normal text-slate-500 line-clamp-1">
                            {c.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {TYPE_LABELS[c.contact_type] ?? c.contact_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate text-slate-700" title={c.value}>
                        {c.value}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {c.commune_name || (
                          <span className="text-slate-400">— Toutes</span>
                        )}
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
                          href={`/admin/utility/${c.id}/edit`}
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
