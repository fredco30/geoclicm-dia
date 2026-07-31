"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Commune, ListingCategory, ListingDetail } from "@/types/api";

type Payload = {
  title: string;
  short_description: string;
  description: string;
  category: number | null;
  commune: number | null;
  locality: string;
  address: string;
  employer_or_agency: string;
  contract_type: string;
  price: string;
  contact_email: string;
  contact_phone: string;
  application_url: string;
  source_url: string;
  status: string;
  expires_at: string | null;
};

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ListingForm({
  listing,
  categories,
  communes,
}: {
  listing?: ListingDetail;
  categories: ListingCategory[];
  communes: Commune[];
}) {
  const router = useRouter();
  const isEdit = !!listing;
  const [form, setForm] = useState<Payload>({
    title: listing?.title ?? "",
    short_description: listing?.short_description ?? "",
    description: listing?.description ?? "",
    category: listing?.category.id ?? null,
    commune: listing?.commune ?? null,
    locality: listing?.locality ?? "",
    address: listing?.address ?? "",
    employer_or_agency: listing?.employer_or_agency ?? "",
    contract_type: listing?.contract_type ?? "",
    price: listing?.price ?? "",
    contact_email: listing?.contact_email ?? "",
    contact_phone: listing?.contact_phone ?? "",
    application_url: listing?.application_url ?? "",
    source_url: listing?.source_url ?? "",
    status: listing?.status ?? "draft",
    expires_at: listing?.expires_at ?? null,
  });
  const [expiresLocal, setExpiresLocal] = useState(toDatetimeLocal(listing?.expires_at ?? null));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof Payload>(k: K, v: Payload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const buildBody = () => ({
    ...form,
    category: form.category,
    commune: form.commune,
    expires_at: expiresLocal ? new Date(expiresLocal).toISOString() : null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }
    const url = isEdit ? `/api/admin/listings/${listing!.slug}/` : `/api/admin/listings/`;
    const method = isEdit ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(buildBody()),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        router.push("/admin/annonces");
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement « ${listing!.title} » ?`)) return;
    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }
    startTransition(async () => {
      const res = await apiFetch(`/api/admin/listings/${listing!.slug}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push("/admin/annonces");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(`Suppression impossible : ${JSON.stringify(data, null, 2)}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/annonces" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Annonces
        </Link>
        <div className="flex gap-2">
          {isEdit ? (
            <Button type="button" variant="secondary" disabled={isPending} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4" /> {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>
      {error ? (
        <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-900">{error}</pre>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="short_description">Description courte *</Label>
          <Input
            id="short_description"
            required
            maxLength={240}
            value={form.short_description}
            onChange={(e) => update("short_description", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <textarea
            id="description"
            required
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category">Catégorie *</Label>
          <Select
            id="category"
            required
            value={form.category ?? ""}
            onChange={(e) => update("category", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Choisir…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="commune">Commune</Label>
          <Select
            id="commune"
            value={form.commune ?? ""}
            onChange={(e) => update("commune", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Intercommunal / non précisé</option>
            {communes
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="locality">Localité (si pas de commune)</Label>
          <Input id="locality" value={form.locality} onChange={(e) => update("locality", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="employer_or_agency">Employeur / agence / contact</Label>
          <Input
            id="employer_or_agency"
            value={form.employer_or_agency}
            onChange={(e) => update("employer_or_agency", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contract_type">Type de contrat / bail</Label>
          <Input
            id="contract_type"
            placeholder="CDI, CDD, saisonnier, bail 1 an…"
            value={form.contract_type}
            onChange={(e) => update("contract_type", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="price">Salaire / loyer / prix</Label>
          <Input id="price" value={form.price} onChange={(e) => update("price", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="expires_at">Expire le</Label>
          <Input
            id="expires_at"
            type="datetime-local"
            value={expiresLocal}
            onChange={(e) => setExpiresLocal(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contact_email">Email de contact</Label>
          <Input
            id="contact_email"
            type="email"
            value={form.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contact_phone">Téléphone de contact</Label>
          <Input
            id="contact_phone"
            value={form.contact_phone}
            onChange={(e) => update("contact_phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="application_url">Lien pour postuler / voir</Label>
          <Input
            id="application_url"
            type="url"
            value={form.application_url}
            onChange={(e) => update("application_url", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="source_url">URL source</Label>
          <Input
            id="source_url"
            type="url"
            value={form.source_url}
            onChange={(e) => update("source_url", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="draft">Brouillon</option>
            <option value="published">Publiée</option>
            <option value="expired">Expirée</option>
            <option value="archived">Archivée</option>
          </Select>
        </div>
      </div>
    </form>
  );
}
