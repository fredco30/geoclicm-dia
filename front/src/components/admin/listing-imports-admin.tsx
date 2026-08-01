"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Commune, ListingCategory, ListingImportCandidate } from "@/types/api";

function csrf() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function ListingImportsAdmin({
  initialCandidates,
  communes,
  categories,
  filterStatus,
  page,
  hasNextPage,
}: {
  initialCandidates: ListingImportCandidate[];
  communes: Commune[];
  categories: ListingCategory[];
  filterStatus: string;
  page: number;
  hasNextPage: boolean;
}) {
  const [rows, setRows] = useState(initialCandidates);
  const [prevInitial, setPrevInitial] = useState(initialCandidates);
  if (prevInitial !== initialCandidates) {
    setPrevInitial(initialCandidates);
    setRows(initialCandidates);
  }
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const update = (id: number, field: "commune" | "category", value: string) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value ? Number(value) : null } : row,
      ),
    );
  const act = (row: ListingImportCandidate, action: "approve" | "reject") =>
    startTransition(async () => {
      let token = csrf();
      if (!token) {
        await apiFetch("/api/auth/csrf/");
        token = csrf();
      }
      const response = await apiFetch(`/api/admin/listing-imports/${row.id}/${action}/`, {
        method: "POST",
        headers: token ? { "X-CSRFToken": token } : {},
        body: JSON.stringify(
          action === "approve" ? { commune: row.commune, category: row.category } : {},
        ),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.detail ?? JSON.stringify(payload) ?? "Action impossible");
        return;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setMessage(
        action === "approve"
          ? `« ${row.title} » publiée dans les annonces.`
          : `« ${row.title} » rejetée.`,
      );
    });
  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/annonces" className="text-sm text-slate-600">
          ← Annonces
        </Link>
        <h1 className="text-xl font-bold">Candidats Annonces</h1>
        <p className="text-sm text-slate-500">
          Annonces (emploi…) détectées automatiquement par l&apos;assistant dans le corpus
          crawlé. Chaque annonce doit être vérifiée avant publication : rien n&apos;est
          publié automatiquement.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {[
            ["pending", "À valider"],
            ["invalid", "Incomplets"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/annonces/imports?status=${value}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                filterStatus === value ? "bg-[#1a4d6e] text-white" : "bg-white text-slate-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {message ? (
        <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">
          Aucun candidat dans ce filtre.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.id} className="overflow-hidden rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase text-[#a8533a]">
                    {row.crawl_source_label} ·{" "}
                    {row.extraction_method === "ai" ? "Extraction IA à vérifier" : "JSON-LD"}
                  </p>
                  <h2 className="font-serif text-xl font-semibold">{row.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {row.employer_or_agency ? `${row.employer_or_agency} · ` : ""}
                    {row.address || row.locality || row.commune_name || "Lieu manquant"}
                    {row.contract_type ? ` · ${row.contract_type}` : ""}
                    {row.price ? ` · ${row.price}` : ""}
                  </p>
                </div>
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#1a4d6e] underline"
                >
                  Source officielle <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {row.short_description ? (
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{row.short_description}</p>
              ) : null}
              {row.extraction_evidence.length ? (
                <blockquote className="mt-3 border-l-2 border-[#1a4d6e] pl-3 text-xs italic text-slate-600">
                  Preuve détectée : « {row.extraction_evidence[0]} »
                </blockquote>
              ) : null}
              {row.validation_errors.length ? (
                <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
                  {row.validation_errors.join(" · ")}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Select
                  aria-label="Commune"
                  value={row.commune ?? ""}
                  onChange={(event) => update(row.id, "commune", event.target.value)}
                >
                  <option value="">Commune (optionnel — intercommunal si vide)</option>
                  {communes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Catégorie"
                  value={row.category ?? ""}
                  onChange={(event) => update(row.id, "category", event.target.value)}
                >
                  <option value="">Choisir la catégorie *</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" disabled={pending} onClick={() => act(row, "reject")}>
                  <X className="h-4 w-4" /> Rejeter
                </Button>
                <Button disabled={pending || !row.category} onClick={() => act(row, "approve")}>
                  <Check className="h-4 w-4" /> Approuver et publier
                </Button>
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
              href={`/admin/annonces/imports?status=${filterStatus}&page=${page - 1}`}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              ← Précédente
            </Link>
          ) : null}
          {hasNextPage ? (
            <Link
              href={`/admin/annonces/imports?status=${filterStatus}&page=${page + 1}`}
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
