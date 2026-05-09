"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  AdminArticleCategory,
  AdminArticleCategoryPayload,
} from "@/types/admin";

type Props = {
  category?: AdminArticleCategory; // undefined → création
};

const COLOR_PRESETS = [
  { value: "#1a4d6e", label: "Bleu camargue" },
  { value: "#a8533a", label: "Terre cuite" },
  { value: "#0e7490", label: "Mer" },
  { value: "#d97706", label: "Agrume" },
  { value: "#047857", label: "Olive" },
  { value: "#475569", label: "Neutre" },
];

const ICON_SUGGESTIONS = [
  "Newspaper", "Camera", "BookOpen", "Mic", "Compass",
  "Heart", "Megaphone", "Tag", "Flame", "Star",
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function ArticleCategoryForm({ category }: Props) {
  const router = useRouter();
  const isEdit = !!category;

  const [form, setForm] = useState<AdminArticleCategoryPayload>({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    color: category?.color ?? "#1a4d6e",
    icon: category?.icon ?? "",
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof AdminArticleCategoryPayload>(
    k: K,
    v: AdminArticleCategoryPayload[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Le nom est obligatoire (ex : « Tribune libre »).");
      return;
    }

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    // Normalisation : si slug vide, on l'omet pour laisser Django auto-générer.
    const payload = { ...form };
    if (!payload.slug?.trim()) delete payload.slug;

    const url = isEdit
      ? `/api/admin/categories/${category!.id}/`
      : "/api/admin/categories/";
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        router.push("/admin/articles/categories");
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (category!.article_count > 0) {
      alert(
        `Cette catégorie contient ${category!.article_count} article(s) publié(s). `
        + "Tu ne peux pas la supprimer tant qu'il y a du contenu dedans. "
        + "Désactive-la plutôt (case « Active » décochée).",
      );
      return;
    }
    if (!confirm(`Supprimer définitivement la catégorie « ${category!.name} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/admin/categories/${category!.id}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { detail?: string }).detail
          || "Erreur lors de la suppression (catégorie peut-être référencée par des articles).",
        );
        return;
      }
      router.push("/admin/articles/categories");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {isEdit
            ? `Catégorie : ${category!.name}`
            : "Nouvelle catégorie d'articles"}
        </h1>
        <Link
          href="/admin/articles/categories"
          className="text-sm text-slate-600 hover:text-[#1a4d6e]"
        >
          ← Retour à la liste
        </Link>
      </div>

      {/* Identité */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Identité
        </legend>

        <div>
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="ex: Tribune libre"
            required
          />
        </div>

        <div>
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            value={form.slug ?? ""}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="laisse vide pour générer automatiquement depuis le nom"
          />
          <p className="mt-1 text-xs text-slate-500">
            Utilisé dans l&apos;URL <code>/categories/&lt;slug&gt;</code>. Si tu
            laisses vide, Django génère <code>tribune-libre</code> depuis
            « Tribune libre ». Évite de modifier le slug d&apos;une catégorie
            existante (cassera les liens et le SEO).
          </p>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
            placeholder="Phrase d'accroche affichée en haut de la page catégorie."
          />
        </div>
      </fieldset>

      {/* Apparence */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Apparence
        </legend>

        <div>
          <Label htmlFor="color">Couleur d&apos;accent</Label>
          <div className="flex items-center gap-2">
            <input
              id="color"
              type="color"
              value={form.color}
              onChange={(e) => update("color", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300"
            />
            <Input
              value={form.color}
              onChange={(e) => update("color", e.target.value)}
              placeholder="#1a4d6e"
              className="font-mono text-sm"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => update("color", p.value)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs hover:border-slate-400"
                style={{
                  backgroundColor: p.value,
                  color: "#fff",
                }}
                title={p.value}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="icon">Icône (Lucide)</Label>
          <Input
            id="icon"
            value={form.icon}
            onChange={(e) => update("icon", e.target.value)}
            placeholder="ex: Newspaper"
            list="icon-suggestions"
          />
          <datalist id="icon-suggestions">
            {ICON_SUGGESTIONS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            Nom exact d&apos;une icône{" "}
            <a
              href="https://lucide.dev/icons/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a4d6e] underline"
            >
              lucide.dev
            </a>
            . Suggestions : {ICON_SUGGESTIONS.slice(0, 5).join(", ")}…
          </p>
        </div>
      </fieldset>

      {/* Ordre + activation */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Affichage
        </legend>

        <div>
          <Label htmlFor="sort_order">Ordre d&apos;affichage</Label>
          <Input
            id="sort_order"
            type="number"
            value={form.sort_order}
            onChange={(e) => update("sort_order", Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-slate-500">
            Plus petit = affiché en premier. Par défaut 0.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
          />
          <span>
            <strong>Active</strong> — décoche pour masquer la catégorie sans
            supprimer (les articles existants restent en BDD mais leur page
            catégorie devient inaccessible).
          </span>
        </label>

        {isEdit && category ? (
          <p className="text-xs text-slate-500">
            <strong>{category.article_count}</strong> article(s) publié(s) dans
            cette catégorie.
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la catégorie"}
        </Button>

        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            title={
              category!.article_count > 0
                ? "Désactive avant de supprimer (catégorie non vide)"
                : "Supprimer définitivement"
            }
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        ) : null}
      </div>
    </form>
  );
}
