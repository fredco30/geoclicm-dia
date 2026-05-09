import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
} from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import type { AdminCrawlSource, CrawlSourceStatus } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

const KIND_LABELS: Record<string, string> = {
  mairie: "Mairie",
  ot: "Office de tourisme",
  wikipedia: "Wikipedia",
  datatourisme: "DataTourisme",
  business: "Commerçant",
  article: "Article",
  osm: "OpenStreetMap",
  tile: "Tuile",
};

async function fetchSources(): Promise<AdminCrawlSource[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/crawl-sources/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminCrawlSource[];
}

function StatusBadge({ status }: { status: CrawlSourceStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        <Clock className="h-3 w-3" aria-hidden />
        Jamais lancé
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        OK
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3 w-3" aria-hidden />
        Partiel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Erreur
    </span>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return "il y a moins d'1 h";
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 30) return `il y a ${Math.round(diffD)} j`;
  return d.toLocaleDateString("fr-FR");
}

export default async function CrawlSourcesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const sources = await fetchSources();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">
          Sources à crawler{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({sources.length})
          </span>
        </h1>
        <Link href="/admin/assistant/sources/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle source
          </Button>
        </Link>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Configure ici les sites web à indexer pour enrichir l&apos;assistant IA :
        sites des mairies, offices de tourisme, sites des commerçants
        partenaires. Le crawl tourne automatiquement <strong>1 fois par
        semaine</strong> sur toutes les sources actives. Tu peux aussi forcer
        un re-crawl à la demande sur la page d&apos;une source.
      </p>

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune source configurée pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Suggestion : commence par les 7 sites de mairies des communes du
            territoire (cf bouton « ? Aide »).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">Dernier crawl</th>
                <th className="px-3 py-2">État</th>
                <th className="px-3 py-2">Chunks</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{s.label}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">
                        {KIND_LABELS[s.kind] ?? s.kind}
                      </span>
                      <a
                        href={s.seed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 truncate text-slate-500 hover:text-[#1a4d6e]"
                        title={s.seed_url}
                      >
                        {s.seed_url}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {s.commune_name || (
                      <span className="text-slate-400">— Multi-communes</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {formatRelative(s.last_crawled_at)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={s.last_status} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">{s.chunk_count}</td>
                  <td className="px-3 py-2">
                    {s.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/assistant/sources/${s.id}/edit`}
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
