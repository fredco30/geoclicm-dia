import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { AdminAdCampaignListItem } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCampaigns(): Promise<AdminAdCampaignListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/ad-campaigns/?ordering=-starts_at&page_size=200`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminAdCampaignListItem>;
  return data.results;
}

export default async function AdsCampaignsPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const campaigns = await fetchCampaigns();
  const now = new Date();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Campagnes publicitaires{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({campaigns.length})
          </span>
        </h1>
        <Link href="/admin/ads/campaigns/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle campagne
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune campagne publicitaire pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Créer la première via « Nouvelle campagne ».
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Campagne</th>
                <th className="px-3 py-2">Emplacement</th>
                <th className="px-3 py-2">Période</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Imp.</th>
                <th className="px-3 py-2 text-right">Clics</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaigns.map((c) => {
                const started = new Date(c.starts_at);
                const ended = new Date(c.ends_at);
                const isLive = c.is_active && started <= now && now <= ended;
                const isFuture = c.is_active && started > now;
                const isPast = ended < now;

                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {c.image?.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.image.thumbnail}
                            alt=""
                            className="h-10 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-16 rounded bg-slate-100" />
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-500">
                            {c.business_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{c.placement_label}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {formatDate(c.starts_at)}
                      <br />
                      <span className="text-slate-400">→ {formatDate(c.ends_at)}</span>
                    </td>
                    <td className="px-3 py-2">
                      {!c.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs">
                          <EyeOff className="h-3 w-3" />
                          Désactivée
                        </span>
                      ) : isPast ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          Terminée
                        </span>
                      ) : isFuture ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          À venir
                        </span>
                      ) : isLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <Eye className="h-3 w-3" />
                          Diffusée
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.impression_count.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.click_count.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.click_through_rate.toFixed(2)} %
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/ads/campaigns/${c.id}/edit`}
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
