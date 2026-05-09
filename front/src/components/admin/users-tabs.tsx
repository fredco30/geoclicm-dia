import Link from "next/link";

import type { AdminUserCounts } from "@/types/admin";

type TabKey = "" | "team" | "advertiser" | "reader" | "inactive";

type Props = {
  activeRole: TabKey;
  counts: AdminUserCounts | null;
  /** Search params actuels (pour les conserver lors du changement de tab). */
  currentSearch: string;
  currentOrdering: string;
};

const TABS: { key: TabKey; label: string; countKey: keyof AdminUserCounts }[] = [
  { key: "", label: "Tous", countKey: "all" },
  { key: "team", label: "Équipe", countKey: "team" },
  { key: "advertiser", label: "Annonceurs", countKey: "advertiser" },
  { key: "reader", label: "Lecteurs", countKey: "reader" },
  { key: "inactive", label: "Inactifs", countKey: "inactive" },
];

/**
 * Tabs de filtre par rôle.
 *
 * Server-rendered : chaque tab est un <Link> qui pousse `?role=...`.
 * Conserve la recherche et le tri courants au passage. Reset la pagination
 * (le compteur affiché correspondrait à un volume différent par tab).
 */
export function UsersTabs({
  activeRole,
  counts,
  currentSearch,
  currentOrdering,
}: Props) {
  return (
    <nav aria-label="Filtrer les comptes" className="overflow-x-auto">
      <ul className="flex gap-1 border-b border-slate-200 text-sm">
        {TABS.map((tab) => {
          const isActive = activeRole === tab.key;
          const params = new URLSearchParams();
          if (tab.key) params.set("role", tab.key);
          if (currentSearch) params.set("search", currentSearch);
          if (currentOrdering) params.set("ordering", currentOrdering);
          const qs = params.toString();
          const count = counts ? counts[tab.countKey] : null;

          return (
            <li key={tab.key || "all"} className="shrink-0">
              <Link
                href={`/admin/settings/users${qs ? `?${qs}` : ""}`}
                aria-current={isActive ? "page" : undefined}
                className={
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 transition " +
                  (isActive
                    ? "border-[#1a4d6e] font-semibold text-[#1a4d6e]"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900")
                }
              >
                <span>{tab.label}</span>
                {count !== null ? (
                  <span
                    className={
                      "rounded-full px-1.5 py-0.5 text-[11px] font-medium " +
                      (isActive
                        ? "bg-[#1a4d6e]/10 text-[#1a4d6e]"
                        : "bg-slate-100 text-slate-600")
                    }
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
