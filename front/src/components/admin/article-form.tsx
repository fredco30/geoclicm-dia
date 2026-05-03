"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MarkdownEditor } from "./markdown-editor";
import { ImageUploader } from "./image-uploader";
import type { ArticleDetail, Category, Commune } from "@/types/api";

type Props = {
  article?: ArticleDetail; // undefined → mode création
  categories: Category[];
  communes: Commune[];
};

type FormState = {
  title: string;
  slug: string;
  chapeau: string;
  body: string;
  cover_image_url: string | null; // URL absolue du cover (read-only display)
  cover_image_id: string | null; // pas utilisé en sprint 1, on uploade direct sur l'article
  category: string; // id en string
  commune: string; // id en string ou ""
  article_type: string;
  status: string;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  sponsor_disclosure: string;
};

const ARTICLE_TYPES = [
  { value: "reportage", label: "Reportage" },
  { value: "portrait", label: "Portrait" },
  { value: "breve", label: "Brève" },
  { value: "tribune", label: "Tribune libre" },
  { value: "dossier", label: "Dossier" },
];

const STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "scheduled", label: "Programmé" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function ArticleForm({ article, categories, communes }: Props) {
  const router = useRouter();
  const isEdit = !!article;

  const [form, setForm] = useState<FormState>({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    chapeau: article?.chapeau ?? "",
    body: article?.body ?? "",
    cover_image_url: article?.cover_image?.medium ?? null,
    cover_image_id: null,
    category: article?.category ? String(article.category.id) : "",
    commune: article?.commune ? String(article.commune.id) : "",
    article_type: article?.article_type ?? "reportage",
    status: article?.status ?? "draft",
    is_featured: article?.is_featured ?? false,
    meta_title: article?.meta_title ?? "",
    meta_description: article?.meta_description ?? "",
    sponsor_disclosure: article?.sponsor_disclosure ?? "",
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // S'assurer d'avoir un csrftoken (le cookie est posé au login)
    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const fd = new FormData();
    fd.append("title", form.title);
    if (form.slug) fd.append("slug", form.slug);
    fd.append("chapeau", form.chapeau);
    fd.append("body", form.body);
    fd.append("category", form.category);
    if (form.commune) fd.append("commune", form.commune);
    fd.append("article_type", form.article_type);
    fd.append("status", form.status);
    fd.append("is_featured", String(form.is_featured));
    fd.append("meta_title", form.meta_title);
    fd.append("meta_description", form.meta_description);
    fd.append("sponsor_disclosure", form.sponsor_disclosure);
    if (coverFile) fd.append("cover_image", coverFile);

    const url = isEdit
      ? `/api/articles/${article!.slug}/`
      : `/api/articles/`;
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: fd,
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        const saved = (await res.json()) as { slug: string };
        router.push(`/admin/articles/${saved.slug}/edit`);
        router.refresh();
      } catch (err) {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement « ${article!.title} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/articles/${article!.slug}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("Suppression impossible.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header sticky avec actions */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 mb-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-sm text-slate-600 hover:text-[#1a4d6e]"
            >
              ← Retour
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Éditer l'article" : "Nouvel article"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && article!.status === "published" ? (
              <Link
                href={`/articles/${article!.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Eye className="h-4 w-4" /> Voir
              </Link>
            ) : null}
            {isEdit ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            ) : null}
            <Button type="submit" disabled={isPending} size="md">
              <Save className="h-4 w-4" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <pre className="overflow-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
        {/* Colonne principale */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              maxLength={250}
              placeholder="Titre de l'article"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapeau">Chapeau</Label>
            <Textarea
              id="chapeau"
              value={form.chapeau}
              onChange={(e) => update("chapeau", e.target.value)}
              maxLength={300}
              placeholder="Accroche de 1-2 phrases (max 300 caractères)"
              rows={3}
            />
            <p className="text-xs text-slate-500">
              {form.chapeau.length} / 300
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Corps de l&apos;article (Markdown)</Label>
            <MarkdownEditor
              value={form.body}
              onChange={(v) => update("body", v)}
            />
          </div>
        </div>

        {/* Sidebar paramètres */}
        <aside className="space-y-6">
          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Publication
            </legend>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => update("is_featured", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              À la une
            </label>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Image de couverture
            </legend>
            <ImageUploader
              currentUrl={form.cover_image_url}
              onFileSelected={(file) => {
                setCoverFile(file);
                if (file) {
                  update("cover_image_url", URL.createObjectURL(file));
                }
              }}
            />
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Catégorisation
            </legend>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
              >
                <option value="">— Choisir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Select
                id="commune"
                value={form.commune}
                onChange={(e) => update("commune", e.target.value)}
              >
                <option value="">— Aucune —</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article_type">Type</Label>
              <Select
                id="article_type"
                value={form.article_type}
                onChange={(e) => update("article_type", e.target.value)}
              >
                {ARTICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              SEO (optionnel)
            </legend>

            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta title (max 70)</Label>
              <Input
                id="meta_title"
                value={form.meta_title}
                onChange={(e) => update("meta_title", e.target.value)}
                maxLength={70}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta description (max 160)</Label>
              <Textarea
                id="meta_description"
                rows={3}
                value={form.meta_description}
                onChange={(e) => update("meta_description", e.target.value)}
                maxLength={160}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sponsoring (article sponsorisé)
            </legend>
            <div className="space-y-2">
              <Label htmlFor="sponsor_disclosure">Mention sponsor</Label>
              <Input
                id="sponsor_disclosure"
                placeholder="ex: En partenariat avec X"
                value={form.sponsor_disclosure}
                onChange={(e) => update("sponsor_disclosure", e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Laisser vide pour un article éditorial classique.
              </p>
            </div>
          </fieldset>
        </aside>
      </div>
    </form>
  );
}
