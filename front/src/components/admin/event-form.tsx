"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus, Eye, Plus, Save, Trash2 } from "lucide-react";

import { ImageUploader } from "@/components/admin/image-uploader";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type {
  BusinessListItem,
  Commune,
  EventCategory,
  EventDetail,
  EventOccurrenceStatus,
} from "@/types/api";

type Props = {
  event?: EventDetail;
  categories: EventCategory[];
  communes: Commune[];
  businesses: BusinessListItem[];
  initialKind?: "event" | "market";
};

type OccurrenceDraft = {
  id?: number;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  status: EventOccurrenceStatus;
  note: string;
};

type FormState = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  kind: "event" | "market";
  category: string;
  commune: string;
  venue_name: string;
  address: string;
  latitude: string;
  longitude: string;
  price: string;
  booking_url: string;
  contact_phone: string;
  contact_email: string;
  organizer: string;
  official_url: string;
  business: string;
  status: "draft" | "published" | "cancelled" | "archived";
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "cancelled", label: "Annulé" },
  { value: "archived", label: "Archivé" },
] as const;

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyOccurrence(): OccurrenceDraft {
  return {
    starts_at: "",
    ends_at: "",
    is_all_day: false,
    status: "scheduled",
    note: "",
  };
}

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function EventForm({
  event,
  categories,
  communes,
  businesses,
  initialKind = "event",
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [repeatCount, setRepeatCount] = useState(4);
  const [form, setForm] = useState<FormState>({
    title: event?.title ?? "",
    slug: event?.slug ?? "",
    short_description: event?.short_description ?? "",
    description: event?.description ?? "",
    kind: event?.kind ?? initialKind,
    category: event ? String(event.category_id) : "",
    commune: event ? String(event.commune_id) : "",
    venue_name: event?.venue_name ?? "",
    address: event?.address ?? "",
    latitude: event?.latitude == null ? "" : String(event.latitude),
    longitude: event?.longitude == null ? "" : String(event.longitude),
    price: event?.price ?? "",
    booking_url: event?.booking_url ?? "",
    contact_phone: event?.contact_phone ?? "",
    contact_email: event?.contact_email ?? "",
    organizer: event?.organizer ?? "",
    official_url: event?.official_url ?? "",
    business: event?.business_id == null ? "" : String(event.business_id),
    status: event?.status ?? "draft",
    is_featured: event?.is_featured ?? false,
    meta_title: event?.meta_title ?? "",
    meta_description: event?.meta_description ?? "",
  });
  const [occurrences, setOccurrences] = useState<OccurrenceDraft[]>(
    event?.occurrences.map((item) => ({
      id: item.id,
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      is_all_day: item.is_all_day,
      status: item.status,
      note: item.note,
    })) ?? [emptyOccurrence()],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateOccurrence = <K extends keyof OccurrenceDraft>(
    index: number,
    key: K,
    value: OccurrenceDraft[K],
  ) => {
    setOccurrences((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  };

  const generateWeekly = () => {
    const first = occurrences[0];
    if (!first?.starts_at || !first.ends_at) {
      setError("Renseigne d'abord le début et la fin de la première date.");
      return;
    }
    const count = Math.max(1, Math.min(52, repeatCount));
    const start = new Date(first.starts_at);
    const end = new Date(first.ends_at);
    setOccurrences(
      Array.from({ length: count }, (_, index) => ({
        ...first,
        id: index === 0 ? first.id : undefined,
        starts_at: toLocalInput(
          new Date(start.getTime() + index * 7 * 86_400_000).toISOString(),
        ),
        ends_at: toLocalInput(
          new Date(end.getTime() + index * 7 * 86_400_000).toISOString(),
        ),
      })),
    );
    setError(null);
  };

  const serializeOccurrences = () => {
    if (occurrences.some((item) => !item.starts_at || !item.ends_at)) {
      throw new Error("Chaque date doit avoir un début et une fin.");
    }
    return occurrences.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      starts_at: new Date(item.starts_at).toISOString(),
      ends_at: new Date(item.ends_at).toISOString(),
      is_all_day: item.is_all_day,
      status: item.status,
      note: item.note,
    }));
  };

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    let occurrencePayload;
    try {
      occurrencePayload = serializeOccurrences();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dates invalides.");
      return;
    }

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const data = new FormData();
    for (const field of [
      "title", "slug", "short_description", "description", "kind",
      "category", "commune", "venue_name", "address", "price",
      "booking_url", "contact_phone", "contact_email", "organizer",
      "official_url", "business", "status", "meta_title", "meta_description",
    ] as const) {
      if (field !== "slug" || form.slug) data.append(field, form[field]);
    }
    if (form.latitude && form.longitude) {
      data.append("latitude", form.latitude);
      data.append("longitude", form.longitude);
    } else if (isEdit) {
      data.append("latitude", "");
      data.append("longitude", "");
    }
    data.append("is_featured", String(form.is_featured));
    data.append("occurrences_json", JSON.stringify(occurrencePayload));
    if (coverFile) data.append("cover_image", coverFile);

    startTransition(async () => {
      try {
        const response = await apiFetch(
          isEdit ? `/api/admin/events/${event!.slug}/` : "/api/admin/events/",
          {
            method: isEdit ? "PATCH" : "POST",
            body: data,
            headers: csrf ? { "X-CSRFToken": csrf } : {},
          },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(
            payload ? JSON.stringify(payload, null, 2) : "Enregistrement impossible.",
          );
          return;
        }
        const saved = payload as { slug: string };
        router.push(`/admin/agenda/${saved.slug}/edit`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDeleteDraft = async () => {
    if (!event || event.status !== "draft") return;
    if (!confirm(`Supprimer définitivement « ${event.title} » ?`)) return;
    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }
    startTransition(async () => {
      const response = await apiFetch(`/api/admin/events/${event.slug}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (response.ok) {
        router.push("/admin/agenda");
        router.refresh();
      } else {
        setError("Suppression impossible. Archive l'événement s'il a déjà été publié.");
      }
    });
  };

  const handleOfficialImage = async (action: "refresh-source-image" | "revert-source-image") => {
    if (!event) return;
    setError(null);
    let csrf = readCsrfToken();
    if (!csrf) { await apiFetch("/api/auth/csrf/"); csrf = readCsrfToken(); }
    startTransition(async () => {
      const response = await apiFetch(`/api/admin/events/${event.slug}/${action}/`, { method: "POST", headers: csrf ? { "X-CSRFToken": csrf } : {} });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(payload?.detail ?? "Action image impossible."); return; }
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin/agenda" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
              ← Agenda
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              {isEdit ? `Éditer : ${event!.title}` : "Nouvel événement"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {event?.status === "published" ? (
              <Link href={`/agenda/${event.slug}`} target="_blank" className="inline-flex items-center gap-1 px-2 text-sm text-slate-700">
                <Eye className="h-4 w-4" /> Voir
              </Link>
            ) : null}
            {event?.status === "draft" ? (
              <Button type="button" variant="danger" size="sm" onClick={handleDeleteDraft} disabled={isPending}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={isPending}>
              <Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {error ? <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">{error}</pre> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Contenu</h2>
            <div className="space-y-2"><Label htmlFor="event-title">Titre *</Label><Input id="event-title" required value={form.title} onChange={(e) => update("title", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="event-summary">Résumé *</Label><Textarea id="event-summary" required maxLength={240} rows={3} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} /><p className="text-right text-xs text-slate-400">{form.short_description.length}/240</p></div>
            <div className="space-y-2"><Label>Description *</Label><MarkdownEditor value={form.description} onChange={(value) => update("description", value)} /></div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Dates</h2><p className="text-sm text-slate-500">Les occurrences sont explicites : chacune peut être reportée ou annulée sans casser la série.</p></div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setOccurrences((rows) => [...rows, emptyOccurrence()])}><Plus className="h-4 w-4" /> Ajouter une date</Button>
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
              <div className="w-28"><Label htmlFor="repeat-count">Semaines</Label><Input id="repeat-count" type="number" min={1} max={52} value={repeatCount} onChange={(e) => setRepeatCount(Number(e.target.value))} /></div>
              <Button type="button" variant="secondary" onClick={generateWeekly}><CalendarPlus className="h-4 w-4" /> Générer chaque semaine</Button>
              <p className="text-xs text-slate-500">Remplace la liste par ce nombre de dates, à partir de la première.</p>
            </div>
            <div className="space-y-3">
              {occurrences.map((item, index) => (
                <div key={item.id ?? `new-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                  <div><Label>Début *</Label><Input type="datetime-local" required value={item.starts_at} onChange={(e) => updateOccurrence(index, "starts_at", e.target.value)} /></div>
                  <div><Label>Fin *</Label><Input type="datetime-local" required value={item.ends_at} onChange={(e) => updateOccurrence(index, "ends_at", e.target.value)} /></div>
                  <div><Label>État de cette date</Label><Select value={item.status} onChange={(e) => updateOccurrence(index, "status", e.target.value as EventOccurrenceStatus)}><option value="scheduled">Prévue</option><option value="postponed">Reportée</option><option value="cancelled">Annulée</option></Select></div>
                  <div><Label>Note publique</Label><Input maxLength={240} value={item.note} onChange={(e) => updateOccurrence(index, "note", e.target.value)} placeholder="Ex. déplacé à la salle municipale" /></div>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.is_all_day} onChange={(e) => updateOccurrence(index, "is_all_day", e.target.checked)} /> Toute la journée</label>
                  <div className="text-right"><Button type="button" variant="ghost" size="sm" disabled={occurrences.length === 1} onClick={() => setOccurrences((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /> Retirer</Button></div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
            <h2 className="md:col-span-2 font-semibold text-slate-900">Lieu et contact</h2>
            <div><Label htmlFor="venue">Lieu *</Label><Input id="venue" required value={form.venue_name} onChange={(e) => update("venue_name", e.target.value)} /></div>
            <div><Label htmlFor="address">Adresse</Label><Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
            <div><Label htmlFor="latitude">Latitude</Label><Input id="latitude" type="number" step="any" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} /></div>
            <div><Label htmlFor="longitude">Longitude</Label><Input id="longitude" type="number" step="any" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} /></div>
            <div><Label htmlFor="organizer">Organisateur</Label><Input id="organizer" value={form.organizer} onChange={(e) => update("organizer", e.target.value)} /></div>
            <div><Label htmlFor="business">Fiche annuaire liée</Label><Select id="business" value={form.business} onChange={(e) => update("business", e.target.value)}><option value="">Aucune</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</Select></div>
            <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} /></div>
            <div><Label htmlFor="official-url">Site officiel</Label><Input id="official-url" type="url" value={form.official_url} onChange={(e) => update("official_url", e.target.value)} /></div>
            <div><Label htmlFor="booking-url">Réservation</Label><Input id="booking-url" type="url" value={form.booking_url} onChange={(e) => update("booking_url", e.target.value)} /></div>
            <div><Label htmlFor="price">Tarif</Label><Input id="price" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="Gratuit, 8 €, tarif libre…" /></div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">Publication</h2>
            <div><Label htmlFor="kind">Type *</Label><Select id="kind" value={form.kind} onChange={(e) => update("kind", e.target.value as FormState["kind"])}><option value="event">Événement</option><option value="market">Marché</option></Select></div>
            <div><Label htmlFor="category">Catégorie *</Label><Select id="category" required value={form.category} onChange={(e) => update("category", e.target.value)}><option value="">Choisir…</option>{categories.filter((category) => category.is_active || category.id === event?.category_id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Link href="/admin/agenda/categories" className="mt-1 inline-block text-xs text-[#1a4d6e] underline">Gérer les catégories</Link></div>
            <div><Label htmlFor="commune">Commune *</Label><Select id="commune" required value={form.commune} onChange={(e) => update("commune", e.target.value)}><option value="">Choisir…</option>{communes.filter((commune) => commune.is_active).map((commune) => <option key={commune.id} value={commune.id}>{commune.name}</option>)}</Select></div>
            <div><Label htmlFor="status">Statut</Label><Select id="status" value={form.status} onChange={(e) => update("status", e.target.value as FormState["status"])}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.is_featured} onChange={(e) => update("is_featured", e.target.checked)} /> Mettre en avant</label>
          </section>
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Image</h2><ImageUploader currentUrl={event?.cover_image?.medium ?? null} onFileSelected={setCoverFile} />{event?.source_image_url ? <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900"><p><strong>Image officielle détectée.</strong> Elle est actualisée automatiquement tant qu’aucun remplacement manuel n’est conservé.</p>{event.image_credit ? <p className="mt-1">Crédit : {event.image_credit}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => handleOfficialImage("refresh-source-image")}>Actualiser depuis la source</Button>{event.cover_image?.original !== event.source_cover_image?.original ? <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => handleOfficialImage("revert-source-image")}>Revenir à l’image officielle</Button> : null}</div></div> : <p className="text-xs text-slate-500">Aucune image officielle liée. Une image déposée ici devient le remplacement manuel.</p>}</section>
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Référencement</h2><div><Label htmlFor="slug">Slug</Label><Input id="slug" value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="Automatique si vide" /></div><div><Label htmlFor="meta-title">Meta title</Label><Input id="meta-title" maxLength={70} value={form.meta_title} onChange={(e) => update("meta_title", e.target.value)} /></div><div><Label htmlFor="meta-description">Meta description</Label><Textarea id="meta-description" maxLength={160} rows={3} value={form.meta_description} onChange={(e) => update("meta_description", e.target.value)} /></div></section>
        </aside>
      </div>
    </form>
  );
}
