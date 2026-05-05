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
import { ImageUploader } from "@/components/admin/image-uploader";
import type { Commune } from "@/types/api";
import type {
  AdminAdCampaignDetail,
  AdminAdCampaignPayload,
  AdminBusinessCategory,
  AdminBusinessListItem,
} from "@/types/admin";

type Props = {
  campaign?: AdminAdCampaignDetail; // undefined → mode création
  businesses: AdminBusinessListItem[];
  communes: Commune[];
  categories: AdminBusinessCategory[];
  /** "admin" : tous les champs. "advertiser" : ciblage / budget / statut masqués. */
  mode?: "admin" | "advertiser";
};

const PLACEMENTS: { value: string; label: string; help: string }[] = [
  { value: "home_hero", label: "Page d'accueil — Hero", help: "Bandeau principal en haut de la home." },
  { value: "home_sidebar", label: "Page d'accueil — Sidebar", help: "Encart entre articles et commerces partenaires." },
  { value: "article_inline", label: "Article — Inline", help: "Encart en fin d'article (avant les tags)." },
  { value: "article_sidebar", label: "Article — Sidebar", help: "Sidebar des articles (réservé desktop)." },
  { value: "directory_top", label: "Annuaire — Top", help: "Encart en haut de /commerces (sous filtres)." },
  { value: "directory_inline", label: "Annuaire — Inline", help: "Encart entre les fiches commerçants." },
  { value: "agenda_top", label: "Agenda — Top", help: "Encart en haut de l'agenda événements (futur)." },
  { value: "weather_top", label: "Météo — Top", help: "Encart en haut de /meteo, au-dessus du bloc météo actuelle. Très haut trafic récurrent (locaux + touristes)." },
  { value: "weather_sidebar", label: "Météo — Sidebar", help: "Sidebar de /meteo (desktop) / fin de page mobile. Visibilité prolongée pendant la lecture des prévisions 7 jours." },
  { value: "newsletter", label: "Newsletter", help: "Encart inclus dans la newsletter mensuelle." },
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function isoToLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdCampaignForm({
  campaign,
  businesses,
  communes,
  categories,
  mode = "admin",
}: Props) {
  const router = useRouter();
  const isEdit = !!campaign;
  const isAdvertiser = mode === "advertiser";

  const apiBase = isAdvertiser
    ? "/api/advertiser/ad-campaigns"
    : "/api/ad-campaigns";
  const listHref = isAdvertiser
    ? "/advertiser/campagnes"
    : "/admin/ads/campaigns";
  const editHrefPrefix = listHref;

  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    business: (campaign?.business ?? businesses[0]?.id ?? null) as number | null,
    placement: campaign?.placement ?? ("home_sidebar" as const),
    headline: campaign?.headline ?? "",
    cta_text: campaign?.cta_text ?? "",
    target_url: campaign?.target_url ?? "",
    target_communes: campaign?.target_communes ?? [],
    target_categories: campaign?.target_categories ?? [],
    starts_at: isoToLocal(campaign?.starts_at ?? null),
    ends_at: isoToLocal(campaign?.ends_at ?? null),
    price_paid: campaign?.price_paid ?? "0",
    is_active: campaign?.is_active ?? true,
    is_paid: campaign?.is_paid ?? false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startsIso = localToIso(form.starts_at);
    const endsIso = localToIso(form.ends_at);
    if (!startsIso || !endsIso) {
      setError("Les dates de début et fin sont obligatoires.");
      return;
    }
    if (new Date(endsIso) <= new Date(startsIso)) {
      setError("La date de fin doit être postérieure au début.");
      return;
    }

    const payload: AdminAdCampaignPayload = {
      name: form.name,
      business: form.business,
      placement: form.placement,
      headline: form.headline,
      cta_text: form.cta_text,
      target_url: form.target_url,
      target_communes: form.target_communes,
      target_categories: form.target_categories,
      starts_at: startsIso,
      ends_at: endsIso,
      price_paid: form.price_paid,
      is_active: form.is_active,
      is_paid: form.is_paid,
    };

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit
      ? `${apiBase}/${campaign!.id}/`
      : `${apiBase}/`;
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        // Étape 1 : champs métier en JSON
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
        const saved = (await res.json()) as { id: number };

        // Étape 2 : image en multipart si présente
        if (imageFile || removeImage) {
          const fd = new FormData();
          if (imageFile) fd.append("image", imageFile);
          else if (removeImage) fd.append("image", "");
          const imgRes = await apiFetch(`${apiBase}/${saved.id}/`, {
            method: "PATCH",
            body: fd,
            headers: csrf ? { "X-CSRFToken": csrf } : {},
          });
          if (!imgRes.ok) {
            const data = await imgRes.json().catch(() => ({}));
            setError(
              `Campagne sauvée mais erreur upload image : ${JSON.stringify(data, null, 2)}`,
            );
            return;
          }
        }

        router.push(`${editHrefPrefix}/${saved.id}/edit`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement la campagne « ${campaign!.name} » ?`))
      return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`${apiBase}/${campaign!.id}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push(listHref);
        router.refresh();
      } else {
        setError("Suppression impossible.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={listHref}
            className="text-sm text-slate-600 hover:text-[#1a4d6e]"
          >
            ← Campagnes
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? `Éditer ${campaign!.name}` : "Nouvelle campagne pub"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
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

      {error ? (
        <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* IDENTITÉ */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Identité
          </legend>
          <div className="space-y-1">
            <Label htmlFor="name">Nom interne *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex: Hipolem été 2026 — sidebar accueil"
            />
            <p className="text-xs text-slate-500">
              Nom utilisé en interne pour identifier la campagne (non public).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="business">Commerçant *</Label>
            <Select
              id="business"
              required
              value={form.business ?? ""}
              onChange={(e) =>
                update("business", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Choisir un commerçant —</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.commune_name})
                </option>
              ))}
            </Select>
          </div>
        </fieldset>

        {/* PLACEMENT */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Emplacement
          </legend>
          <div className="space-y-1">
            <Label htmlFor="placement">Où afficher l&apos;encart *</Label>
            <Select
              id="placement"
              required
              value={form.placement}
              onChange={(e) =>
                update("placement", e.target.value as typeof form.placement)
              }
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              {PLACEMENTS.find((p) => p.value === form.placement)?.help}
            </p>
          </div>
        </fieldset>

        {/* CRÉA */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Créa
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Image / bannière *</Label>
              <p className="text-xs text-slate-500">
                Format 16:9 recommandé (ex: 1600×900 px). JPG ou PNG.
              </p>
              <ImageUploader
                currentUrl={
                  removeImage
                    ? null
                    : imageFile
                      ? null
                      : campaign?.image?.large ?? null
                }
                onFileSelected={(file) => {
                  setImageFile(file);
                  if (file) setRemoveImage(false);
                  else if (campaign?.image) setRemoveImage(true);
                }}
              />
              {imageFile ? (
                <p className="text-xs text-green-700">
                  ✓ Nouveau fichier : {imageFile.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="headline">
                  Titre court ({form.headline.length}/80)
                </Label>
                <Input
                  id="headline"
                  maxLength={80}
                  value={form.headline}
                  onChange={(e) => update("headline", e.target.value)}
                  placeholder="Ex: Plombier 7j/7 sur la Camargue"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cta_text">Texte du bouton</Label>
                <Input
                  id="cta_text"
                  maxLength={30}
                  value={form.cta_text}
                  onChange={(e) => update("cta_text", e.target.value)}
                  placeholder="Ex: Devis gratuit, Réserver, Découvrir"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="target_url">URL de destination *</Label>
                <Input
                  id="target_url"
                  type="url"
                  required
                  value={form.target_url}
                  onChange={(e) => update("target_url", e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-slate-500">
                  Le clic sera tracké via /r/&lt;id&gt;/ avant redirection.
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {/* CIBLAGE — admin uniquement */}
        {!isAdvertiser ? (
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ciblage (optionnel)
          </legend>
          <p className="text-xs text-slate-500">
            Vide = pas de filtre, l&apos;encart est servi quel que soit le
            contexte de la page. Sinon, l&apos;encart ne s&apos;affiche que si
            la commune et/ou catégorie de la page courante correspondent.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="target_communes">Communes ciblées</Label>
              <select
                id="target_communes"
                multiple
                size={Math.min(communes.length, 7)}
                value={form.target_communes.map(String)}
                onChange={(e) =>
                  update(
                    "target_communes",
                    Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                  )
                }
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
              >
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.department})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="target_categories">Catégories ciblées</Label>
              <select
                id="target_categories"
                multiple
                size={7}
                value={form.target_categories.map(String)}
                onChange={(e) =>
                  update(
                    "target_categories",
                    Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                  )
                }
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_name ? `${c.parent_name} > ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Cmd/Ctrl + clic pour multi-sélection.
              </p>
            </div>
          </div>
        </fieldset>
        ) : null}

        {/* PÉRIODE */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Période de diffusion
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="starts_at">Début *</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(e) => update("starts_at", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ends_at">Fin *</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                required
                value={form.ends_at}
                onChange={(e) => update("ends_at", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* BUDGET + WORKFLOW — admin uniquement */}
        {!isAdvertiser ? (
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Budget &amp; statut
          </legend>
          <div className="space-y-1">
            <Label htmlFor="price_paid">Prix payé HT (€)</Label>
            <Input
              id="price_paid"
              type="number"
              step="0.01"
              min={0}
              value={form.price_paid}
              onChange={(e) => update("price_paid", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) => update("is_paid", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Paiement reçu
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Campagne active (peut être servie)
          </label>
        </fieldset>
        ) : (
          <fieldset className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Validation
            </legend>
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              ℹ️ Ta campagne est créée en attente de validation par
              l&apos;équipe geoclicMédia. Une fois validée et le paiement
              reçu, elle commencera à diffuser sur les pages ciblées.
            </p>
          </fieldset>
        )}
      </div>

      {/* STATS (édition seulement) */}
      {isEdit ? (
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <Stat label="Impressions" value={campaign!.impression_count.toLocaleString("fr-FR")} />
          <Stat label="Clics" value={campaign!.click_count.toLocaleString("fr-FR")} />
          <Stat label="CTR" value={`${campaign!.click_through_rate.toFixed(2)} %`} />
        </div>
      ) : null}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
