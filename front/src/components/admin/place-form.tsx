"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Save, Trash2 } from "lucide-react";

import { ImageUploader } from "./image-uploader";
import { MarkdownEditor } from "./markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { ArticleListItem, BusinessListItem, Commune, EventListItem, PlaceCategory, PlaceDetail, PlaceStatus } from "@/types/api";

type Props = { place?: PlaceDetail; categories: PlaceCategory[]; communes: Commune[]; articles: ArticleListItem[]; businesses: BusinessListItem[]; events: EventListItem[] };

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function PlaceForm({ place, categories, communes, articles, businesses, events }: Props) {
  const router = useRouter();
  const isEdit = Boolean(place);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: place?.title ?? "", slug: place?.slug ?? "", short_description: place?.short_description ?? "", description: place?.description ?? "",
    category: place ? String(place.category_id) : "", commune: place ? String(place.commune_id) : "", address: place?.address ?? "",
    latitude: place?.latitude == null ? "" : String(place.latitude), longitude: place?.longitude == null ? "" : String(place.longitude),
    duration: place?.duration ?? "", difficulty: place?.difficulty ?? "", accessibility: place?.accessibility ?? "", best_season: place?.best_season ?? "", practical_info: place?.practical_info ?? "", official_url: place?.official_url ?? "",
    status: place?.status ?? "draft" as PlaceStatus, is_featured: place?.is_featured ?? false, sort_order: place?.sort_order ?? 0,
    meta_title: place?.meta_title ?? "", meta_description: place?.meta_description ?? "",
    related_articles: place?.related_article_ids ?? [], related_businesses: place?.related_business_ids ?? [], related_events: place?.related_event_ids ?? [],
  });
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      let csrf = csrfToken();
      if (!csrf) { await apiFetch("/api/auth/csrf/"); csrf = csrfToken(); }
      const data = new FormData();
      for (const field of ["title", "slug", "short_description", "description", "category", "commune", "address", "duration", "difficulty", "accessibility", "best_season", "practical_info", "official_url", "status", "meta_title", "meta_description"] as const) {
        if (field !== "slug" || form.slug) data.append(field, form[field]);
      }
      data.append("sort_order", String(form.sort_order));
      data.append("is_featured", String(form.is_featured));
      if (form.latitude && form.longitude) { data.append("latitude", form.latitude); data.append("longitude", form.longitude); }
      else if (isEdit) { data.append("latitude", ""); data.append("longitude", ""); }
      data.append("related_articles_json", JSON.stringify(form.related_articles));
      data.append("related_businesses_json", JSON.stringify(form.related_businesses));
      data.append("related_events_json", JSON.stringify(form.related_events));
      if (coverFile) data.append("cover_image", coverFile);
      const response = await apiFetch(isEdit ? `/api/admin/places/${place!.slug}/` : "/api/admin/places/", { method: isEdit ? "PATCH" : "POST", body: data, headers: csrf ? { "X-CSRFToken": csrf } : {} });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(payload ? JSON.stringify(payload, null, 2) : "Enregistrement impossible."); return; }
      router.push(`/admin/decouvrir/${(payload as { slug: string }).slug}/edit`); router.refresh();
    });
  };

  const deleteDraft = () => {
    if (!place || place.status !== "draft" || !confirm(`Supprimer définitivement « ${place.title} » ?`)) return;
    startTransition(async () => {
      let csrf = csrfToken(); if (!csrf) { await apiFetch("/api/auth/csrf/"); csrf = csrfToken(); }
      const response = await apiFetch(`/api/admin/places/${place.slug}/`, { method: "DELETE", headers: csrf ? { "X-CSRFToken": csrf } : {} });
      if (response.ok) { router.push("/admin/decouvrir"); router.refresh(); } else setError("Suppression impossible. Archive la fiche si elle a déjà été publiée.");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div><Link href="/admin/decouvrir" className="text-sm text-slate-600">← Découvrir</Link><h1 className="text-lg font-semibold">{isEdit ? `Éditer : ${place!.title}` : "Nouveau lieu"}</h1></div>
        <div className="flex gap-2">{place?.status === "published" ? <Link href={`/decouvrir/${place.slug}`} target="_blank" className="inline-flex items-center gap-1 px-2 text-sm"><Eye className="h-4 w-4" /> Voir</Link> : null}{place?.status === "draft" ? <Button type="button" variant="danger" size="sm" onClick={deleteDraft}><Trash2 className="h-4 w-4" /> Supprimer</Button> : null}<Button size="sm" disabled={isPending}><Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer"}</Button></div>
      </div>
      {error ? <pre className="whitespace-pre-wrap rounded bg-red-50 p-3 text-xs text-red-800">{error}</pre> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border bg-white p-5"><h2 className="font-semibold">Contenu</h2><Field label="Titre *"><Input required value={form.title} onChange={(e) => update("title", e.target.value)} /></Field><Field label="Résumé *"><Textarea required maxLength={240} rows={3} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} /></Field><Field label="Description *"><MarkdownEditor value={form.description} onChange={(value) => update("description", value)} /></Field></section>
          <section className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2"><h2 className="font-semibold md:col-span-2">Localisation &amp; pratique</h2><Field label="Adresse"><Input value={form.address} onChange={(e) => update("address", e.target.value)} /></Field><div /><Field label="Latitude"><Input type="number" step="any" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} /></Field><Field label="Longitude"><Input type="number" step="any" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} /></Field><Field label="Durée"><Input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="Ex. 1 h 30" /></Field><Field label="Difficulté"><Input value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)} placeholder="Facile, familiale…" /></Field><Field label="Saison conseillée"><Input value={form.best_season} onChange={(e) => update("best_season", e.target.value)} /></Field><Field label="Site officiel"><Input type="url" value={form.official_url} onChange={(e) => update("official_url", e.target.value)} /></Field><Field label="Accessibilité"><Textarea rows={3} value={form.accessibility} onChange={(e) => update("accessibility", e.target.value)} /></Field><Field label="Informations pratiques"><Textarea rows={3} value={form.practical_info} onChange={(e) => update("practical_info", e.target.value)} /></Field></section>
          <section className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-3"><div className="md:col-span-3"><h2 className="font-semibold">Contenus reliés</h2><p className="text-sm text-slate-500">La fiche référence l’existant ; elle ne recopie pas articles, commerces ou événements.</p></div><RelationSelect label="Articles publiés" values={form.related_articles} options={articles.map((item) => ({ id: item.id, label: item.title }))} onChange={(values) => update("related_articles", values)} /><RelationSelect label="Commerces publiés" values={form.related_businesses} options={businesses.map((item) => ({ id: item.id, label: item.name }))} onChange={(values) => update("related_businesses", values)} /><RelationSelect label="Événements publiés" values={form.related_events} options={events.map((item) => ({ id: item.id, label: item.title }))} onChange={(values) => update("related_events", values)} /></section>
        </div>
        <aside className="space-y-5">
          <section className="space-y-4 rounded-xl border bg-white p-4"><h2 className="font-semibold">Publication</h2><Field label="Catégorie *"><Select required value={form.category} onChange={(e) => update("category", e.target.value)}><option value="">Choisir…</option>{categories.filter((item) => item.is_active || item.id === place?.category_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Commune *"><Select required value={form.commune} onChange={(e) => update("commune", e.target.value)}><option value="">Choisir…</option>{communes.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Statut"><Select value={form.status} onChange={(e) => update("status", e.target.value as PlaceStatus)}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></Select></Field><Field label="Ordre"><Input type="number" min={0} value={form.sort_order} onChange={(e) => update("sort_order", Number(e.target.value))} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => update("is_featured", e.target.checked)} /> Mettre en avant</label><Link href="/admin/decouvrir/categories" className="text-xs text-[#1a4d6e] underline">Gérer les catégories</Link></section>
          <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Image</h2><ImageUploader currentUrl={place?.cover_image?.medium ?? null} onFileSelected={setCoverFile} /></section>
          <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Référencement</h2><Field label="Slug"><Input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="Automatique" /></Field><Field label="Meta title"><Input maxLength={70} value={form.meta_title} onChange={(e) => update("meta_title", e.target.value)} /></Field><Field label="Meta description"><Textarea maxLength={160} rows={3} value={form.meta_description} onChange={(e) => update("meta_description", e.target.value)} /></Field></section>
        </aside>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function RelationSelect({ label, values, options, onChange }: { label: string; values: number[]; options: { id: number; label: string }[]; onChange: (values: number[]) => void }) { return <Field label={label}><select multiple size={Math.min(8, Math.max(4, options.length))} value={values.map(String)} onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => Number(option.value)))} className="w-full rounded-md border border-slate-300 p-2 text-sm">{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p className="text-xs text-slate-400">Ctrl/Cmd + clic pour plusieurs choix.</p></Field>; }
