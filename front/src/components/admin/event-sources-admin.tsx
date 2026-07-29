"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Play, Plus, RefreshCw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Commune, EventCategory, EventSource } from "@/types/api";
import type { AdminCrawlSource } from "@/types/admin";

type Draft = {
  label: string;
  crawl_source: string;
  url_patterns: string;
  connector: "auto" | "json_ld" | "crawl4ai" | "ics";
  source_url: string;
  website_url: string;
  commune: string;
  default_category: string;
  default_kind: "event" | "market";
  max_pages: number;
  is_active: boolean;
  sync_images: boolean;
  rights_note: string;
};

const EMPTY: Draft = {
  label: "",
  crawl_source: "",
  url_patterns: "",
  connector: "auto",
  source_url: "",
  website_url: "",
  commune: "",
  default_category: "",
  default_kind: "event",
  max_pages: 0,
  is_active: true,
  sync_images: true,
  rights_note: "",
};

const STATUS_LABELS: Record<EventSource["last_status"], string> = {
  never: "Jamais lancée",
  running: "Analyse en cours",
  ok: "Terminée",
  partial: "Partielle",
  error: "Erreur",
};

function csrf() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function draftFrom(source: EventSource): Draft {
  return {
    label: source.label,
    crawl_source: source.crawl_source ? String(source.crawl_source) : "",
    url_patterns: source.url_patterns,
    connector: source.connector,
    source_url: source.source_url,
    website_url: source.website_url,
    commune: source.commune ? String(source.commune) : "",
    default_category: source.default_category
      ? String(source.default_category)
      : "",
    default_kind: source.default_kind,
    max_pages: source.max_pages,
    is_active: source.is_active,
    sync_images: source.sync_images,
    rights_note: source.rights_note,
  };
}

function methodLabel(method: EventSource["detected_methods"][number]) {
  if (method === "json_ld") return "JSON-LD";
  if (method === "ai") return "IA";
  return "ICS";
}

export function EventSourcesAdmin({
  initialSources,
  communes,
  categories,
  crawlSources,
}: {
  initialSources: EventSource[];
  communes: Commune[];
  categories: EventCategory[];
  crawlSources: AdminCrawlSource[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [selected, setSelected] = useState<EventSource | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (source: EventSource | null) => {
    setSelected(source);
    setDraft(source ? draftFrom(source) : EMPTY);
    setMessage(null);
  };

  const refreshSources = useCallback(async () => {
    const response = await apiFetch("/api/admin/event-sources/");
    if (!response.ok) return;
    const refreshed = (await response.json()) as EventSource[];
    setSources(refreshed);
    setSelected((current) => {
      if (!current) return null;
      return refreshed.find((row) => row.id === current.id) ?? current;
    });
  }, []);

  useEffect(() => {
    if (!sources.some((source) => source.last_status === "running")) return;
    const timer = window.setInterval(() => void refreshSources(), 4000);
    return () => window.clearInterval(timer);
  }, [refreshSources, sources]);

  const request = (path: string, init: RequestInit = {}) =>
    startTransition(async () => {
      let token = csrf();
      if (!token) {
        await apiFetch("/api/auth/csrf/");
        token = csrf();
      }
      const response = await apiFetch(path, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          ...(token ? { "X-CSRFToken": token } : {}),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.detail ?? JSON.stringify(payload) ?? "Action impossible");
        return;
      }
      if (path.endsWith("/run/")) {
        setMessage("Analyse lancée. La progression se met à jour automatiquement.");
        setSources((rows) =>
          rows.map((row) =>
            row.id === selected?.id ? { ...row, last_status: "running" } : row,
          ),
        );
        setSelected((row) => (row ? { ...row, last_status: "running" } : row));
        return;
      }
      const saved = payload as EventSource;
      setSources((rows) =>
        rows.some((row) => row.id === saved.id)
          ? rows.map((row) => (row.id === saved.id ? saved : row))
          : [...rows, saved],
      );
      choose(saved);
      setMessage("Source enregistrée.");
    });

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const body = {
      ...draft,
      crawl_source: draft.crawl_source ? Number(draft.crawl_source) : null,
      commune: draft.commune ? Number(draft.commune) : null,
      default_category: draft.default_category
        ? Number(draft.default_category)
        : null,
    };
    request(
      selected
        ? `/api/admin/event-sources/${selected.id}/`
        : "/api/admin/event-sources/",
      { method: selected ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/agenda" className="text-sm text-slate-600">
            ← Agenda
          </Link>
          <h1 className="text-xl font-bold">Sources officielles</h1>
          <p className="text-sm text-slate-500">
            JSON-LD et ICS sont prioritaires. L’IA traite seulement les pages
            restantes et chaque candidat passe par la validation admin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => void refreshSources()}
          >
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
          <Button size="sm" onClick={() => choose(null)}>
            <Plus className="h-4 w-4" /> Nouvelle
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase">
              <tr>
                <th className="p-3">Source</th>
                <th>Collecte</th>
                <th>État</th>
                <th>À valider</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((source) => (
                <tr
                  key={source.id}
                  onClick={() => choose(source)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3">
                    <strong>{source.label}</strong>
                    <span className="block max-w-md truncate text-xs text-slate-400">
                      {source.source_url}
                    </span>
                  </td>
                  <td>
                    <span className="font-medium">Automatique</span>
                    <span className="block text-xs text-slate-400">
                      {source.detected_methods.length
                        ? source.detected_methods.map(methodLabel).join(", ")
                        : "À détecter"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-medium">
                      {STATUS_LABELS[source.last_status]}
                    </span>
                    {source.ai_total_parts > 0 ? (
                      <span className="block text-xs text-slate-500">
                        IA {source.ai_completed_parts}/{source.ai_total_parts}
                        {source.ai_failed_parts
                          ? ` · ${source.ai_failed_parts} échec(s)`
                          : ""}
                      </span>
                    ) : null}
                  </td>
                  <td>{source.pending_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sources.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Aucune source configurée.
            </p>
          ) : null}
        </div>

        <form
          onSubmit={save}
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <h2 className="font-semibold">
            {selected ? "Modifier la source" : "Nouvelle source"}
          </h2>
          {message ? (
            <p className="rounded bg-blue-50 p-2 text-xs text-blue-900">
              {message}
            </p>
          ) : null}
          {selected?.ai_provider ? (
            <div className="rounded bg-slate-50 p-2 text-xs text-slate-700">
              IA : <strong>{selected.ai_provider}</strong>
              {selected.ai_model ? ` · ${selected.ai_model}` : ""}
              {selected.ai_total_parts
                ? ` · ${selected.ai_completed_parts}/${selected.ai_total_parts} segment(s)`
                : ""}
            </div>
          ) : null}
          {selected?.last_error ? (
            <p className="max-h-36 overflow-auto rounded bg-red-50 p-2 text-xs text-red-900">
              {selected.last_error}
            </p>
          ) : null}

          <div>
            <Label>Nom *</Label>
            <Input
              required
              value={draft.label}
              onChange={(event) =>
                setDraft({ ...draft, label: event.target.value })
              }
            />
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            <strong>Collecte automatique</strong>
            <p className="mt-1 text-xs">
              GeoClic réutilise le corpus partagé et ne renvoie à l’IA que les
              contenus nouveaux ou modifiés.
            </p>
          </div>
          <details className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Réglages avancés
            </summary>
            <div className="mt-3">
              <Label>Corpus de crawl partagé</Label>
              <Select
                value={draft.crawl_source}
                onChange={(event) =>
                  setDraft({ ...draft, crawl_source: event.target.value })
                }
              >
                <option value="">Associer automatiquement par domaine</option>
                {crawlSources.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label} ({row.page_count} pages)
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-3">
              <Label>Motifs URL des événements</Label>
              <textarea
                className="min-h-20 w-full rounded-md border border-slate-300 p-2 text-sm"
                value={draft.url_patterns}
                onChange={(event) =>
                  setDraft({ ...draft, url_patterns: event.target.value })
                }
              />
              {selected ? (
                <p className="mt-1 text-xs text-slate-500">
                  Ces motifs retiennent{" "}
                  <strong>{selected.selected_page_count}</strong> page(s) du
                  corpus — seules elles seront analysées par l&apos;IA.
                </p>
              ) : null}
            </div>
          </details>
          <div>
            <Label>URL source *</Label>
            <Input
              type="url"
              required
              value={draft.source_url}
              onChange={(event) =>
                setDraft({ ...draft, source_url: event.target.value })
              }
            />
          </div>
          <div>
            <Label>Site officiel</Label>
            <Input
              type="url"
              value={draft.website_url}
              onChange={(event) =>
                setDraft({ ...draft, website_url: event.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commune</Label>
              <Select
                value={draft.commune}
                onChange={(event) =>
                  setDraft({ ...draft, commune: event.target.value })
                }
              >
                <option value="">Automatique</option>
                {communes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={draft.default_category}
                onChange={(event) =>
                  setDraft({ ...draft, default_category: event.target.value })
                }
              >
                <option value="">Automatique</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Preuve / droit de réutilisation</Label>
            <Input
              value={draft.rights_note}
              onChange={(event) =>
                setDraft({ ...draft, rights_note: event.target.value })
              }
              placeholder="Open data, accord écrit, flux public…"
            />
          </div>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) =>
                setDraft({ ...draft, is_active: event.target.checked })
              }
            />
            Source active
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.sync_images}
              onChange={(event) =>
                setDraft({ ...draft, sync_images: event.target.checked })
              }
            />
            Actualiser automatiquement l’image officielle
          </label>
          <Button type="submit" disabled={pending} className="w-full">
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
          {selected ? (
            <Button
              type="button"
              variant="secondary"
              disabled={
                pending ||
                !selected.is_active ||
                selected.last_status === "running"
              }
              className="w-full"
              onClick={() =>
                request(`/api/admin/event-sources/${selected.id}/run/`, {
                  method: "POST",
                })
              }
            >
              <Play className="h-4 w-4" /> Analyser maintenant
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
