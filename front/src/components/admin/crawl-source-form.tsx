"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, AlertTriangle, CheckCircle2, ExternalLink, Play } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import type { Commune } from "@/types/api";
import type {
  AdminCrawlSource,
  AdminCrawlSourcePayload,
  CrawlSourceKind,
} from "@/types/admin";

type Props = {
  source?: AdminCrawlSource; // undefined → création
  communes: Commune[];
};

const KIND_OPTIONS: { value: CrawlSourceKind; label: string; placeholder: string }[] = [
  { value: "mairie", label: "Site mairie", placeholder: "https://www.legrauduroi.fr/" },
  { value: "ot", label: "Office de tourisme", placeholder: "https://www.ot-aiguesmortes.fr/" },
  { value: "wikipedia", label: "Page Wikipedia", placeholder: "https://fr.wikipedia.org/wiki/..." },
  { value: "business", label: "Site commerçant", placeholder: "https://www.lecommerce.fr/" },
  { value: "article", label: "Article externe", placeholder: "https://exemple.fr/article" },
];

const DATATOURISME_OPTION = {
  value: "datatourisme" as const,
  label: "DataTourisme — non implémenté",
  placeholder: "https://www.datatourisme.fr/...",
};

const STATUS_PRESETS: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "OK", bg: "bg-emerald-100", text: "text-emerald-800", icon: CheckCircle2 },
  partial: { label: "Partiel", bg: "bg-amber-100", text: "text-amber-800", icon: AlertTriangle },
  error: { label: "Erreur", bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle },
};

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export function CrawlSourceForm({ source, communes }: Props) {
  const router = useRouter();
  const isEdit = !!source;

  const [form, setForm] = useState<AdminCrawlSourcePayload>({
    label: source?.label ?? "",
    kind: source?.kind ?? "mairie",
    seed_url: source?.seed_url ?? "",
    max_depth: source?.max_depth ?? 2,
    is_active: source?.is_active ?? true,
    commune: source?.commune ?? null,
  });

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRunning, setIsRunning] = useState(false);

  const sortedCommunes = [...communes].sort((a, b) => a.sort_order - b.sort_order);
  const kindOptions =
    source?.kind === "datatourisme"
      ? [...KIND_OPTIONS, DATATOURISME_OPTION]
      : KIND_OPTIONS;
  const update = <K extends keyof AdminCrawlSourcePayload>(
    k: K,
    v: AdminCrawlSourcePayload[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const currentKind = KIND_OPTIONS.find((k) => k.value === form.kind);

  // Auto-suggestion du label si on a kind + commune sélectionnés et label vide
  const suggestLabel = () => {
    if (form.label.trim()) return;
    const commune = sortedCommunes.find((c) => c.id === form.commune);
    const kindLabel = currentKind?.label ?? form.kind;
    if (commune) {
      update("label", `${kindLabel} — ${commune.name}`);
    } else {
      update("label", kindLabel);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!form.label.trim()) {
      setError("Le libellé est obligatoire (ex: « Mairie Le Grau-du-Roi »).");
      return;
    }
    if (!form.seed_url.trim()) {
      setError("L'URL à crawler est obligatoire.");
      return;
    }
    if (form.kind === "datatourisme" && form.is_active) {
      setError(
        "L'indexeur DataTourisme n'est pas implémenté. Désactivez cette source avant de l'enregistrer.",
      );
      return;
    }

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit
      ? `/api/admin/crawl-sources/${source!.id}/`
      : "/api/admin/crawl-sources/";
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(form),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        const saved = (await res.json()) as { id: number };
        router.push(`/admin/assistant/sources/${saved.id}/edit`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement la source « ${source!.label} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/admin/crawl-sources/${source!.id}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (!res.ok) {
        setError("Erreur lors de la suppression.");
        return;
      }
      router.push("/admin/assistant/sources");
      router.refresh();
    });
  };

  const handleRunNow = async () => {
    if (!isEdit) return;
    if (source?.kind === "datatourisme") {
      setError(
        "L'indexeur DataTourisme n'est pas implémenté. Désactivez cette source ou choisissez un type pris en charge.",
      );
      return;
    }
    setError(null);
    setInfo(null);

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    setIsRunning(true);
    try {
      const res = await apiFetch(`/api/admin/crawl-sources/${source!.id}/run/`, {
        method: "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Erreur lors du déclenchement du crawl.");
      } else {
        setInfo(
          data.detail ||
          "Crawl lancé. Le statut se mettra à jour automatiquement dans 1-2 minutes.",
        );
      }
    } catch {
      setError("Erreur réseau au déclenchement.");
    } finally {
      setIsRunning(false);
    }
  };

  // Bloc "Statistiques" rendu uniquement en mode édition
  const statusKey = source?.last_status || "";
  const statusPreset = STATUS_PRESETS[statusKey];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {isEdit ? `Source : ${source!.label}` : "Nouvelle source à crawler"}
        </h1>
        <Link
          href="/admin/assistant/sources"
          className="text-sm text-slate-600 hover:text-[#1a4d6e]"
        >
          ← Retour à la liste
        </Link>
      </div>

      {/* Statistiques + bouton « Crawler maintenant » (uniquement en édition) */}
      {isEdit && source ? (
        <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-slate-700">
            Statut
          </legend>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Dernier crawl
              </p>
              <p className="mt-0.5 text-slate-800">
                {formatDate(source.last_crawled_at)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                État
              </p>
              <p className="mt-0.5">
                {statusPreset ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusPreset.bg} ${statusPreset.text}`}
                  >
                    <statusPreset.icon className="h-3 w-3" aria-hidden />
                    {statusPreset.label}
                  </span>
                ) : (
                  <span className="text-slate-400">— jamais lancé</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Chunks indexés
              </p>
              <p className="mt-0.5 text-slate-800">{source.chunk_count}</p>
            </div>
          </div>

          {source.last_error ? (
            <div className="rounded-md bg-red-50 p-2 text-xs text-red-800 ring-1 ring-red-200">
              <strong>Dernière erreur :</strong> {source.last_error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleRunNow}
            disabled={
              isRunning || !source.is_active || source.kind === "datatourisme"
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1a4d6e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#13384f] disabled:opacity-50"
            title={
              source.kind === "datatourisme"
                ? "L'indexeur DataTourisme n'est pas encore implémenté"
                : source.is_active
                ? "Lance immédiatement un crawl en arrière-plan"
                : "La source doit être active pour être crawlée"
            }
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            {isRunning ? "Déclenchement…" : "Crawler maintenant"}
          </button>
          {info ? (
            <p className="text-xs text-emerald-700">{info}</p>
          ) : null}
        </fieldset>
      ) : null}

      {/* Identité */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Identification
        </legend>

        <div>
          <Label htmlFor="kind">Type de source *</Label>
          <Select
            id="kind"
            value={form.kind}
            onChange={(e) => update("kind", e.target.value as CrawlSourceKind)}
          >
            {kindOptions.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          {form.kind === "datatourisme" ? (
            <p className="mt-1 text-xs text-amber-700">
              Cette source est conservée pour compatibilité, mais son indexeur
              est un no-op. Elle ne doit pas être activée avant implémentation.
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="commune">Commune attachée</Label>
          <Select
            id="commune"
            value={form.commune ?? ""}
            onChange={(e) =>
              update("commune", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">— Aucune (source territoriale, multi-communes) —</option>
            {sortedCommunes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Si la source concerne UNE commune précise, choisissez-la pour que
            les chunks indexés soient marqués territorialement. L&apos;IA
            structurera mieux ses réponses.
          </p>
        </div>

        <div>
          <Label htmlFor="label">Libellé *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="label"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder="ex: Mairie Le Grau-du-Roi"
              required
              className="flex-1"
            />
            <button
              type="button"
              onClick={suggestLabel}
              className="rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
              title="Auto-générer le libellé depuis le type et la commune"
            >
              Auto
            </button>
          </div>
        </div>
      </fieldset>

      {/* URL */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Configuration du crawl
        </legend>

        <div>
          <Label htmlFor="seed_url">URL de départ *</Label>
          <Input
            id="seed_url"
            type="url"
            value={form.seed_url}
            onChange={(e) => update("seed_url", e.target.value)}
            placeholder={currentKind?.placeholder ?? "https://..."}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            URL racine à crawler. Le crawler suivra les liens internes (même
            domaine) jusqu&apos;à la profondeur configurée.{" "}
            {form.seed_url ? (
              <a
                href={form.seed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[#1a4d6e] hover:underline"
              >
                Tester l&apos;URL
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </p>
        </div>

        <div>
          <Label htmlFor="max_depth">Profondeur max (0-4)</Label>
          <Input
            id="max_depth"
            type="number"
            min={0}
            max={4}
            value={form.max_depth}
            onChange={(e) => update("max_depth", Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-slate-500">
            <strong>0</strong> = juste la page d&apos;accueil ·{" "}
            <strong>1</strong> = home + pages liées (recommandé pour un site
            commerçant) · <strong>2</strong> = recommandé pour mairies/OT ·{" "}
            <strong>3-4</strong> = très long, déconseillé.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
          />
          <span>
            <strong>Active</strong> — décocher pour suspendre temporairement le
            crawl (les chunks déjà indexés restent dans la base).
          </span>
        </label>
      </fieldset>

      {error ? (
        <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la source"}
        </Button>

        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        ) : null}
      </div>
    </form>
  );
}
