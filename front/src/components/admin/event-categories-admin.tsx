"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import type { EventCategory } from "@/types/api";

type ManagedCategory = EventCategory & { description?: string };
type Draft = Pick<ManagedCategory, "name" | "slug" | "icon" | "color" | "sort_order" | "is_active" | "description">;
const EMPTY: Draft = { name: "", slug: "", icon: "", color: "#1a4d6e", sort_order: 0, is_active: true, description: "" };

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function EventCategoriesAdmin({ initialCategories, apiBase = "/api/admin/event-categories", backHref = "/admin/agenda", title = "Catégories de l’agenda", supportsDescription = false }: { initialCategories: ManagedCategory[]; apiBase?: string; backHref?: string; title?: string; supportsDescription?: boolean }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const beginCreate = () => { setEditing(null); setDraft(EMPTY); setError(null); };
  const beginEdit = (category: ManagedCategory) => {
    setEditing(category);
    setDraft({ name: category.name, slug: category.slug, icon: category.icon, color: category.color, sort_order: category.sort_order, is_active: category.is_active, description: category.description ?? "" });
    setError(null);
  };

  const save = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      let csrf = csrfToken();
      if (!csrf) { await apiFetch("/api/auth/csrf/"); csrf = csrfToken(); }
      const response = await apiFetch(editing ? `${apiBase}/${editing.slug}/` : `${apiBase}/`, {
        method: editing ? "PATCH" : "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(payload ? JSON.stringify(payload, null, 2) : "Enregistrement impossible."); return; }
      const saved = payload as ManagedCategory;
      setCategories((rows) => editing ? rows.map((row) => row.id === saved.id ? saved : row).sort((a, b) => a.sort_order - b.sort_order) : [...rows, saved].sort((a, b) => a.sort_order - b.sort_order));
      setEditing(saved);
      setDraft({ name: saved.name, slug: saved.slug, icon: saved.icon, color: saved.color, sort_order: saved.sort_order, is_active: saved.is_active, description: saved.description ?? "" });
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><Link href={backHref} className="text-sm text-slate-600 hover:text-[#1a4d6e]">← Retour</Link><h1 className="text-xl font-bold text-slate-900">{title}</h1></div>
        <Button size="sm" onClick={beginCreate}><Plus className="h-4 w-4" /> Nouvelle catégorie</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {categories.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Aucune catégorie.</p> : (
            <table className="w-full text-sm"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Ordre</th><th className="px-3 py-2">État</th></tr></thead><tbody className="divide-y">{categories.map((category) => <tr key={category.id} onClick={() => beginEdit(category)} className={`cursor-pointer hover:bg-slate-50 ${editing?.id === category.id ? "bg-blue-50" : ""}`}><td className="px-3 py-2"><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} /><span className="font-medium">{category.name}</span><span className="ml-2 text-xs text-slate-400">{category.icon}</span></td><td className="px-3 py-2 text-slate-600">{category.sort_order}</td><td className="px-3 py-2"><span className={category.is_active ? "text-green-700" : "text-slate-400"}>{category.is_active ? "Active" : "Masquée dans les filtres"}</span></td></tr>)}</tbody></table>
          )}
        </div>
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{editing ? "Modifier" : "Créer"}</h2>{editing ? <button type="button" onClick={beginCreate} aria-label="Fermer"><X className="h-4 w-4" /></button> : null}</div>
          {error ? <pre className="whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800">{error}</pre> : null}
          <div><Label htmlFor="category-name">Nom *</Label><Input id="category-name" required value={draft.name} onChange={(event) => setDraft((row) => ({ ...row, name: event.target.value }))} /></div>
          <div><Label htmlFor="category-slug">Slug</Label><Input id="category-slug" value={draft.slug} onChange={(event) => setDraft((row) => ({ ...row, slug: event.target.value }))} placeholder="Automatique si vide" /></div>
          <div><Label htmlFor="category-icon">Icône Lucide</Label><Input id="category-icon" value={draft.icon} onChange={(event) => setDraft((row) => ({ ...row, icon: event.target.value }))} placeholder="music, landmark…" /></div>
          {supportsDescription ? <div><Label htmlFor="category-description">Description</Label><textarea id="category-description" rows={3} value={draft.description ?? ""} onChange={(event) => setDraft((row) => ({ ...row, description: event.target.value }))} className="w-full rounded-md border border-slate-300 p-2 text-sm" /></div> : null}
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="category-color">Couleur</Label><Input id="category-color" type="color" value={draft.color} onChange={(event) => setDraft((row) => ({ ...row, color: event.target.value }))} /></div><div><Label htmlFor="category-order">Ordre</Label><Input id="category-order" type="number" min={0} value={draft.sort_order} onChange={(event) => setDraft((row) => ({ ...row, sort_order: Number(event.target.value) }))} /></div></div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((row) => ({ ...row, is_active: event.target.checked }))} /> Disponible dans les filtres et formulaires</label>
          <Button type="submit" disabled={isPending} className="w-full"><Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          <p className="text-xs text-slate-500">Une catégorie utilisée n’est pas supprimée : désactive-la pour préserver les événements historiques.</p>
        </form>
      </div>
    </div>
  );
}
