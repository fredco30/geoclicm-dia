/* eslint-disable @next/next/no-img-element */
"use client";
import { ImportReviewNote } from "@/components/admin/import-review-note";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, CheckSquare, ExternalLink, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Commune, EventCategory, EventImportCandidate } from "@/types/api";
import { formatApiError } from "@/lib/api-errors";
function csrf() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(new Date(value))
    : "Date manquante";
}
function day(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}
type Occ = EventImportCandidate["occurrences"][number];
function datedOccurrences(row: EventImportCandidate): Occ[] {
  return (row.occurrences || [])
    .filter((o) => o.starts_at && !Number.isNaN(new Date(o.starts_at).getTime()))
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!));
}
// Prochaine occurrence non terminée, recalculée à l'affichage : starts_at
// est figé au moment du crawl et peut déjà être passé pour une série.
function nextOccurrence(row: EventImportCandidate): Occ | null {
  const now = Date.now();
  const dated = datedOccurrences(row);
  return (
    dated.find((o) => new Date(o.ends_at || o.starts_at!).getTime() >= now) ??
    dated[dated.length - 1] ??
    null
  );
}
function schedule(row: EventImportCandidate) {
  const dated = datedOccurrences(row);
  const next = nextOccurrence(row);
  if (next) {
    const label = next.is_all_day ? day(next.starts_at!) : date(next.starts_at);
    const now = Date.now();
    const remaining = dated.filter(
      (o) => new Date(o.ends_at || o.starts_at!).getTime() >= now,
    );
    if (remaining.length > 1) {
      const last = remaining[remaining.length - 1];
      return `${label} · ${remaining.length} dates jusqu'au ${day(last.starts_at!)}`;
    }
    return label;
  }
  if (row.starts_at) return date(row.starts_at);
  const hint =
    row.extraction_evidence && row.extraction_evidence.length
      ? ` « ${row.extraction_evidence[0]} »`
      : "";
  return `Récurrence ou période non datée — à préciser${hint}`;
}

// Un évènement « fiable » a commune + catégorie + preuve vérifiée + une date
// de fin future (on n'auto-valide jamais un évènement passé ou non daté).
function isReliable(row: EventImportCandidate) {
  if (row.review?.validity.state !== "current") return false;
  if (
    row.commune == null ||
    row.category == null ||
    row.extraction_evidence.length === 0
  )
    return false;
  // Fin de la DERNIÈRE occurrence : une série dont la première date est
  // passée reste fiable tant qu'il lui reste des dates.
  const dated = datedOccurrences(row);
  const lastOcc = dated[dated.length - 1];
  const end = lastOcc ? lastOcc.ends_at || lastOcc.starts_at : row.ends_at || row.starts_at;
  if (!end) return false;
  return new Date(end).getTime() >= Date.now();
}

export function EventImportsAdmin({
  initialCandidates,
  communes,
  categories,
  filterStatus,
  page,
  hasNextPage,
}: {
  initialCandidates: EventImportCandidate[];
  communes: Commune[];
  categories: EventCategory[];
  filterStatus: string;
  page: number;
  hasNextPage: boolean;
}) {
  const [rows, setRows] = useState(initialCandidates);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [prevInitial, setPrevInitial] = useState(initialCandidates);
  if (prevInitial !== initialCandidates) {
    setPrevInitial(initialCandidates);
    setRows(initialCandidates);
    setSelected(new Set());
  }
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingRows = useMemo(
    () => rows.filter((row) => row.status === "pending"),
    [rows],
  );
  const reliableCount = useMemo(
    () => pendingRows.filter(isReliable).length,
    [pendingRows],
  );
  const selectedCount = selected.size;

  const update = (id: number, field: "commune" | "category", value: string) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value ? Number(value) : null } : row,
      ),
    );
  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectReliable = () =>
    setSelected(new Set(pendingRows.filter(isReliable).map((row) => row.id)));
  // Candidats modifiables (classement, sélection) : à valider ou incomplets.
  const editableRows = useMemo(
    () => rows.filter((row) => row.status === "pending" || row.status === "invalid"),
    [rows],
  );
  const selectPage = () => setSelected(new Set(editableRows.map((row) => row.id)));
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkCommune, setBulkCommune] = useState("");
  const clearSelection = () => setSelected(new Set());
  const ensureCsrf = async () => {
    let token = csrf();
    if (!token) {
      await apiFetch("/api/auth/csrf/");
      token = csrf();
    }
    return token;
  };

  const act = (row: EventImportCandidate, action: "approve" | "reject") =>
    startTransition(async () => {
      const token = await ensureCsrf();
      const response = await apiFetch(
        `/api/admin/event-imports/${row.id}/${action}/`,
        {
          method: "POST",
          headers: token ? { "X-CSRFToken": token } : {},
          body: JSON.stringify(
            action === "approve"
              ? { commune: row.commune, category: row.category }
              : {},
          ),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          formatApiError(payload, "Action impossible"),
        );
        return;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      setMessage(
        action === "approve"
          ? `« ${row.title} » publié et synchronisé.`
          : `« ${row.title} » rejeté.`,
      );
    });

  const bulkClassify = () =>
    startTransition(async () => {
      const token = await ensureCsrf();
      const response = await apiFetch("/api/admin/event-imports/bulk-classify/", {
        method: "POST",
        headers: token ? { "X-CSRFToken": token } : {},
        body: JSON.stringify({
          ids: Array.from(selected),
          category: bulkCategory ? Number(bulkCategory) : null,
          commune: bulkCommune ? Number(bulkCommune) : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(formatApiError(payload, "Classement impossible"));
        return;
      }
      const updated = new Map<number, EventImportCandidate>(
        (payload?.updated ?? []).map((row: EventImportCandidate) => [row.id, row]),
      );
      const ready: number = (payload?.ready_ids ?? []).length;
      // Un candidat devenu complet quitte l'onglet « Incomplets ».
      setRows((current) =>
        current
          .map((row) => updated.get(row.id) ?? row)
          .filter((row) => row.status === filterStatus),
      );
      setSelected(new Set());
      setMessage(
        `${updated.size} candidat(s) classé(s).` +
          (ready
            ? ` ${ready} désormais complet(s) : à approuver dans l'onglet « À valider ».`
            : ""),
      );
    });

  const bulkApprove = () =>
    startTransition(async () => {
      const token = await ensureCsrf();
      const response = await apiFetch(
        "/api/admin/event-imports/bulk-approve/",
        {
          method: "POST",
          headers: token ? { "X-CSRFToken": token } : {},
          body: JSON.stringify({ ids: Array.from(selected) }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.detail ?? "Approbation en masse impossible");
        return;
      }
      const imported: number = payload?.imported ?? 0;
      const errors: string[] = payload?.errors ?? [];
      const importedIds = new Set<number>(payload?.imported_ids ?? []);
      setRows((current) => current.filter((row) => !importedIds.has(row.id)));
      setSelected(new Set());
      setMessage(
        `${imported} évènement(s) publié(s).` +
          (errors.length ? ` ${errors.length} échec(s) : ${errors[0]}` : ""),
      );
    });

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/agenda" className="text-sm text-slate-600">
          ← Agenda
        </Link>
        <h1 className="text-xl font-bold">À valider — Agenda</h1>
        <p className="text-sm text-slate-500">
          Les évènements terminés avant le crawl sont conservés comme expirés,
          mais ne sont jamais proposés à la validation.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {[
            ["pending", "À valider"],
            ["invalid", "Incomplets"],
            ["duplicate", "Doublons"],
            ["expired", "Expirés"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/agenda/imports?status=${value}`}
              className={`rounded-full border px-3 py-1 text-xs ${filterStatus === value ? "bg-camargue text-white" : "bg-white text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {(filterStatus === "pending" || filterStatus === "invalid") && editableRows.length > 0 ? (
          <div className="mt-4 space-y-3 rounded-xl border bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {filterStatus === "pending" ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={selectReliable}
              >
                <CheckSquare className="h-4 w-4" /> Sélectionner les fiables de la page (
                {reliableCount})
              </Button>
            ) : null}
            <Button variant="secondary" disabled={pending} onClick={selectPage}>
              <CheckSquare className="h-4 w-4" /> Sélectionner la page ({editableRows.length})
            </Button>
            <Button
              variant="secondary"
              disabled={pending || selectedCount === 0}
              onClick={clearSelection}
            >
              <Square className="h-4 w-4" /> Tout décocher
            </Button>
            {filterStatus === "pending" ? (
              <Button
                disabled={pending || selectedCount === 0}
                onClick={bulkApprove}
              >
                <Check className="h-4 w-4" /> Approuver la sélection (
                {selectedCount})
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-sm font-medium text-slate-700">Classer la sélection :</span>
            <Select
              aria-label="Catégorie à attribuer"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              className="w-44"
            >
              <option value="">Catégorie…</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Commune à attribuer"
              value={bulkCommune}
              onChange={(event) => setBulkCommune(event.target.value)}
              className="w-44"
            >
              <option value="">Commune…</option>
              {communes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              disabled={pending || selectedCount === 0 || (!bulkCategory && !bulkCommune)}
              onClick={bulkClassify}
            >
              Appliquer à {selectedCount} candidat{selectedCount > 1 ? "s" : ""}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            {filterStatus === "pending"
              ? "Les « fiables » ont commune + catégorie + preuve + une date future. Décochez ceux à exclure avant d'approuver."
              : "La plupart des incomplets n'ont pas de catégorie : cochez-en plusieurs, choisissez la catégorie, puis « Appliquer ». Ceux qui deviennent complets passent dans « À valider » (rien n'est publié sans approbation)."}
          </p>
          </div>
        ) : null}
      </div>
      {message ? (
        <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          {message}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">
          Aucun candidat dans ce filtre.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article
              key={row.id}
              className="relative grid overflow-hidden rounded-xl border bg-white shadow-sm md:grid-cols-[220px_minmax(0,1fr)]"
            >
              {row.status === "pending" || row.status === "invalid" ? (
                <label
                  className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow"
                  title={
                    selected.has(row.id) ? "Désélectionner" : "Sélectionner"
                  }
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-camargue"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Sélectionner ${row.title}`}
                  />
                </label>
              ) : null}
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full min-h-48 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex min-h-48 items-center justify-center bg-slate-100 text-xs text-slate-400">
                  Pas d&apos;image détectée
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-terracotta">
                    {row.status === "expired"
                      ? "Expiré— consultation uniquement"
                      : `${row.source_label} · ${row.extraction_method === "ai" ? "Extraction IA à vérifier" : row.extraction_method === "ics" ? "ICS" : "JSON-LD"}`}
                  </p>
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-camargue underline"
                  >
                    Source officielle <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <h2 className="font-serif text-xl font-semibold">
                    {row.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {schedule(row)} ·{" "}
                    {row.venue_name || row.address || "Lieu manquant"}
                  </p>
                </div>
                {row.short_description ? (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                    {row.short_description}
                  </p>
                ) : null}
                {row.extraction_evidence.length ? (
                  <blockquote className="mt-3 border-l-2 border-camargue pl-3 text-xs italic text-slate-600">
                    Preuve détectée : « {row.extraction_evidence[0]} »
                  </blockquote>
                ) : null}
                <ImportReviewNote review={row.review} />
              {row.validation_errors.length ? (
                  <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
                    {row.validation_errors.join(" · ")}
                  </p>
                ) : null}
                {!["expired", "duplicate"].includes(row.status) ? (
                  <>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Select
                        aria-label="Commune"
                        value={row.commune ?? ""}
                        onChange={(event) =>
                          update(row.id, "commune", event.target.value)
                        }
                        className="w-44"
                      >
                        <option value="">Choisir la commune *</option>
                        {communes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label="Catégorie"
                        value={row.category ?? ""}
                        onChange={(event) =>
                          update(row.id, "category", event.target.value)
                        }
                        className="w-44"
                      >
                        <option value="">Choisir la catégorie *</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                      <div className="ml-auto flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => act(row, "reject")}
                        >
                          <X className="h-4 w-4" /> Rejeter
                        </Button>
                        <Button
                          disabled={
                            pending ||
                            !row.commune ||
                            !row.category ||
                            !row.starts_at ||
                            !row.ends_at
                          }
                          onClick={() => act(row, "approve")}
                        >
                          <Check className="h-4 w-4" /> Approuver et publier
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <nav className="mt-6 flex items-center justify-between">
        <span className="text-sm text-slate-500">Page {page}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/agenda/imports?status=${filterStatus}&page=${page - 1}`}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              ← Précédente
            </Link>
          ) : null}
          {hasNextPage ? (
            <Link
              href={`/admin/agenda/imports?status=${filterStatus}&page=${page + 1}`}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              Suivante →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
