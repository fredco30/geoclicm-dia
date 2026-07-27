"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, MapPin, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { geocodeAddress } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AIBusinessAssistButton } from "@/components/admin/ai-business-assist-button";
import { AIRewriteButton } from "@/components/admin/ai-rewrite-button";
import {
  OpeningHoursEditor,
  type OpeningHoursValue,
} from "@/components/admin/opening-hours-editor";
import {
  SeasonalClosuresEditor,
  type ClosureValue,
} from "@/components/admin/seasonal-closures-editor";
import type { Commune } from "@/types/api";
import type {
  AdminBusinessCategory,
  AdminBusinessDetail,
  AdminBusinessPayload,
  BusinessPlan,
} from "@/types/admin";

type Props = {
  business?: AdminBusinessDetail;
  categories: AdminBusinessCategory[]; // toutes (racines + enfants), pour select
  communes: Commune[];
  /**
   * "admin" : tous les champs (admin/editor — back-office /admin/...).
   * "advertiser" : champs auto-gérés par l'équipe masqués (Plan commercial,
   *  is_published, is_featured, is_claimed). Endpoint /api/advertiser/businesses/.
   */
  mode?: "admin" | "advertiser";
  /** Chemin de retour après suppression / annulation. */
  backHref?: string;
};

const DEFAULT_OPENING_HOURS: OpeningHoursValue = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const PLANS: { value: BusinessPlan; label: string; help: string }[] = [
  { value: "free", label: "Gratuit", help: "Fiche publique de base, pas d'encarts pub." },
  { value: "basic", label: "Basic — 79€/an", help: "Fiche enrichie, 1 encart pub localisé." },
  { value: "premium", label: "Premium — 149€/an", help: "Fiche complète, plusieurs encarts pub, mise en avant." },
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Format datetime-local input (YYYY-MM-DDTHH:mm) → ISO ou null. */
function localToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → format datetime-local input (YYYY-MM-DDTHH:mm). */
function isoToLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BusinessForm({
  business,
  categories,
  communes,
  mode = "admin",
  backHref,
}: Props) {
  const router = useRouter();
  const isEdit = !!business;
  const isAdvertiser = mode === "advertiser";

  // Endpoints + URLs de redirection diffèrent selon le mode
  const apiBase = isAdvertiser ? "/api/advertiser/businesses" : "/api/businesses";
  const listHref = isAdvertiser ? "/advertiser/fiches" : "/admin/directory/businesses";
  const editHrefPrefix = isAdvertiser
    ? "/advertiser/fiches"
    : "/admin/directory/businesses";
  const backLinkHref = backHref ?? listHref;

  const [form, setForm] = useState({
    name: business?.name ?? "",
    legal_name: business?.legal_name ?? "",
    siret: business?.siret ?? "",
    category: (business?.category?.id ?? categories[0]?.id ?? null) as number | null,
    secondary_categories: business?.secondary_categories.map((c) => c.id) ?? [],
    short_description: business?.short_description ?? "",
    description: business?.description ?? "",
    specialties_text: (business?.specialties ?? []).join(", "),
    address: business?.address ?? "",
    address_complement: business?.address_complement ?? "",
    postal_code: business?.postal_code ?? "",
    city: business?.city ?? "",
    latitude: business?.latitude ?? null,
    longitude: business?.longitude ?? null,
    commune: (business?.commune ?? communes[0]?.id ?? null) as number | null,
    service_areas: business?.service_areas.map((c) => c.id) ?? [],
    phone: business?.phone ?? "",
    mobile: business?.mobile ?? "",
    email: business?.email ?? "",
    website: business?.website ?? "",
    facebook_url: business?.facebook_url ?? "",
    instagram_url: business?.instagram_url ?? "",
    tiktok_url: business?.tiktok_url ?? "",
    opening_hours: (business?.opening_hours ?? DEFAULT_OPENING_HOURS) as OpeningHoursValue,
    seasonal_closures: (business?.seasonal_closures ?? []) as ClosureValue[],
    plan: business?.plan ?? ("free" as BusinessPlan),
    plan_starts_at: isoToLocal(business?.plan_starts_at ?? null),
    plan_ends_at: isoToLocal(business?.plan_ends_at ?? null),
    is_claimed: business?.is_claimed ?? false,
    is_published: business?.is_published ?? false,
    is_featured: business?.is_featured ?? false,
    is_local_producer: business?.is_local_producer ?? false,
    meta_description: business?.meta_description ?? "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeocoding, setIsGeocoding] = useState(false);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGeocode = async () => {
    setGeoMessage(null);
    const query = `${form.address}, ${form.postal_code} ${form.city}`.trim();
    if (!form.address || !form.city) {
      setGeoMessage("Saisis au moins l'adresse et la ville avant de géocoder.");
      return;
    }
    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(query);
      if (result) {
        update("latitude", result.latitude);
        update("longitude", result.longitude);
        setGeoMessage(
          `Géocodé : ${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)} — ${result.display_name}`,
        );
      } else {
        setGeoMessage(
          "Adresse introuvable via Nominatim. Vérifie l'orthographe ou saisis lat/lng manuellement.",
        );
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const specialties = form.specialties_text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const basePayload = {
      name: form.name,
      legal_name: form.legal_name,
      siret: form.siret,
      category: form.category,
      secondary_categories: form.secondary_categories,
      short_description: form.short_description,
      description: form.description,
      specialties,
      address: form.address,
      address_complement: form.address_complement,
      postal_code: form.postal_code,
      city: form.city,
      latitude: form.latitude,
      longitude: form.longitude,
      commune: form.commune,
      service_areas: form.service_areas,
      phone: form.phone,
      mobile: form.mobile,
      email: form.email,
      website: form.website,
      facebook_url: form.facebook_url,
      instagram_url: form.instagram_url,
      tiktok_url: form.tiktok_url,
      opening_hours: form.opening_hours,
      seasonal_closures: form.seasonal_closures,
      meta_description: form.meta_description,
    };

    // Champs admin-only — exclus du payload en mode advertiser (le serializer
    // backend les ignorerait de toute façon, mais on évite d'envoyer du bruit)
    const payload: AdminBusinessPayload | typeof basePayload = isAdvertiser
      ? basePayload
      : {
          ...basePayload,
          plan: form.plan,
          plan_starts_at: localToIso(form.plan_starts_at),
          plan_ends_at: localToIso(form.plan_ends_at),
          is_claimed: form.is_claimed,
          is_published: form.is_published,
          is_featured: form.is_featured,
          is_local_producer: form.is_local_producer,
        };

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit
      ? `${apiBase}/${business!.slug}/`
      : `${apiBase}/`;
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        // 1. POST/PATCH JSON pour tous les champs hors images
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
        const saved = (await res.json()) as { slug: string };

        // 2. Si fichier(s) sélectionné(s) ou suppression demandée, PATCH multipart
        const hasImageChanges =
          logoFile || coverFile || removeLogo || removeCover;
        if (hasImageChanges) {
          const fd = new FormData();
          if (logoFile) fd.append("logo", logoFile);
          else if (removeLogo) fd.append("logo", "");
          if (coverFile) fd.append("cover_image", coverFile);
          else if (removeCover) fd.append("cover_image", "");

          const imgRes = await apiFetch(`${apiBase}/${saved.slug}/`, {
            method: "PATCH",
            body: fd,
            headers: csrf ? { "X-CSRFToken": csrf } : {},
          });
          if (!imgRes.ok) {
            const data = await imgRes.json().catch(() => ({}));
            setError(
              `Fiche sauvée, mais erreur upload image : ${JSON.stringify(data, null, 2)}`,
            );
            return;
          }
        }

        router.push(`${editHrefPrefix}/${saved.slug}/edit`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement « ${business!.name} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`${apiBase}/${business!.slug}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push(listHref);
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
        <div className="flex items-center gap-2">
          <Link
            href={backLinkHref}
            className="text-sm text-slate-600 hover:text-[#1a4d6e]"
          >
            ← {isAdvertiser ? "Mes fiches" : "Commerçants"}
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? `Éditer ${business!.name}` : "Nouveau commerçant"}
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
        {/* MÉDIAS */}
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Médias
          </legend>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo</Label>
              <p className="text-xs text-slate-500">
                Format carré recommandé (ex: 600×600 px). Affiché en vignette
                dans les listings et en petit sur la fiche.
              </p>
              <ImageUploader
                currentUrl={
                  removeLogo
                    ? null
                    : (logoFile ? null : business?.logo?.medium ?? null)
                }
                onFileSelected={(file) => {
                  setLogoFile(file);
                  if (file) setRemoveLogo(false);
                  else if (business?.logo) setRemoveLogo(true);
                }}
              />
              {logoFile ? (
                <p className="text-xs text-green-700">
                  ✓ Nouveau fichier prêt : {logoFile.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Photo de couverture</Label>
              <p className="text-xs text-slate-500">
                Bandeau 16:9 affiché en haut de la fiche (ex: 1600×900 px).
                Visuel principal du commerce.
              </p>
              <ImageUploader
                currentUrl={
                  removeCover
                    ? null
                    : (coverFile ? null : business?.cover_image?.large ?? null)
                }
                onFileSelected={(file) => {
                  setCoverFile(file);
                  if (file) setRemoveCover(false);
                  else if (business?.cover_image) setRemoveCover(true);
                }}
              />
              {coverFile ? (
                <p className="text-xs text-green-700">
                  ✓ Nouveau fichier prêt : {coverFile.name}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        {/* IDENTITÉ */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Identité
          </legend>
          <div className="space-y-1">
            <Label htmlFor="name">Nom commercial *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="legal_name">Raison sociale</Label>
            <Input
              id="legal_name"
              value={form.legal_name}
              onChange={(e) => update("legal_name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="siret">SIRET (14 chiffres)</Label>
            <Input
              id="siret"
              value={form.siret}
              onChange={(e) => update("siret", e.target.value)}
              maxLength={14}
              pattern="\d{14}"
              placeholder="Ex: 51234567890123"
            />
          </div>
        </fieldset>

        {/* CLASSIFICATION */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Classification
          </legend>
          <div className="space-y-1">
            <Label htmlFor="category">Catégorie principale *</Label>
            <Select
              id="category"
              required
              value={form.category ?? ""}
              onChange={(e) =>
                update("category", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_name ? `${c.parent_name} > ` : ""}
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="secondary_categories">Catégories secondaires</Label>
            <select
              id="secondary_categories"
              multiple
              size={6}
              value={form.secondary_categories.map(String)}
              onChange={(e) =>
                update(
                  "secondary_categories",
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
              Cmd/Ctrl + clic pour sélectionner plusieurs catégories.
            </p>
          </div>
        </fieldset>

        {/* DESCRIPTIONS */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descriptions
            </legend>
            <AIBusinessAssistButton
              getCurrentName={() => form.name}
              getCurrentCategoryId={() => form.category}
              getCurrentCommuneId={() => form.commune}
              getExistingShortDescription={() => form.short_description}
              getExistingSpecialties={() =>
                form.specialties_text
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              }
              businessId={business?.id ?? null}
              onApply={(data) => {
                update("short_description", data.short_description);
                update("description", data.description);
                update("specialties_text", data.specialties.join(", "));
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="short_description">
              Description courte * ({form.short_description.length}/200)
            </Label>
            <Input
              id="short_description"
              required
              maxLength={200}
              value={form.short_description}
              onChange={(e) => update("short_description", e.target.value)}
              placeholder="Phrase d'accroche affichée dans les listings"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="description">Description complète *</Label>
              <AIRewriteButton
                value={form.description}
                onChange={(v) => update("description", v)}
                context="business"
              />
            </div>
            <textarea
              id="description"
              required
              rows={5}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="specialties_text">Spécialités (séparées par virgule)</Label>
            <Input
              id="specialties_text"
              value={form.specialties_text}
              onChange={(e) => update("specialties_text", e.target.value)}
              placeholder="Ex: Pizza au feu de bois, Pasta fraîches, Tiramisu maison"
            />
          </div>
        </fieldset>

        {/* LOCALISATION */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Localisation
          </legend>
          <div className="space-y-1">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              required
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Ex: 12 quai Colbert"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_complement">Complément d&apos;adresse</Label>
            <Input
              id="address_complement"
              value={form.address_complement}
              onChange={(e) => update("address_complement", e.target.value)}
              placeholder="Bâtiment, étage, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="postal_code">Code postal *</Label>
              <Input
                id="postal_code"
                required
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="commune">Commune (siège) *</Label>
            <Select
              id="commune"
              required
              value={form.commune ?? ""}
              onChange={(e) =>
                update("commune", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Choisir —</option>
              {communes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department})
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              Commune où le commerce est physiquement implanté (utilisée pour la carte
              et la fiche). Doit correspondre à une commune couverte par le média.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="service_areas">Zones desservies (multi-sélection)</Label>
            <select
              id="service_areas"
              multiple
              size={Math.min(communes.length, 7)}
              value={form.service_areas.map(String)}
              onChange={(e) =>
                update(
                  "service_areas",
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
            <p className="text-xs text-slate-500">
              Communes supplémentaires où le commerçant intervient (artisans
              multi-communes, services à domicile…). Cmd/Ctrl + clic pour
              sélectionner plusieurs. Vide = uniquement la commune siège.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={form.latitude ?? ""}
                onChange={(e) =>
                  update("latitude", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={form.longitude ?? ""}
                onChange={(e) =>
                  update("longitude", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGeocode}
              disabled={isGeocoding}
            >
              {isGeocoding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isGeocoding ? "Géocodage..." : "Géocoder l'adresse"}
            </Button>
            {geoMessage ? (
              <p className="mt-1.5 text-xs text-slate-600">{geoMessage}</p>
            ) : null}
          </div>
        </fieldset>

        {/* CONTACT */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </legend>
          <div className="space-y-1">
            <Label htmlFor="phone">Téléphone fixe</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://"
            />
          </div>
        </fieldset>

        {/* RÉSEAUX SOCIAUX */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Réseaux sociaux
          </legend>
          <div className="space-y-1">
            <Label htmlFor="facebook_url">Facebook</Label>
            <Input
              id="facebook_url"
              type="url"
              value={form.facebook_url}
              onChange={(e) => update("facebook_url", e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="instagram_url">Instagram</Label>
            <Input
              id="instagram_url"
              type="url"
              value={form.instagram_url}
              onChange={(e) => update("instagram_url", e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiktok_url">TikTok</Label>
            <Input
              id="tiktok_url"
              type="url"
              value={form.tiktok_url}
              onChange={(e) => update("tiktok_url", e.target.value)}
              placeholder="https://tiktok.com/@..."
            />
          </div>
        </fieldset>

        {/* HORAIRES */}
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Horaires &amp; fermetures
          </legend>
          <div className="space-y-2">
            <Label>Horaires d&apos;ouverture</Label>
            <p className="text-xs text-slate-500">
              Plusieurs créneaux possibles par jour (ex: 9h-12h30 + 14h-19h pour
              une coupure midi). Pas de créneau = fermé ce jour-là.
            </p>
            <OpeningHoursEditor
              value={form.opening_hours}
              onChange={(v) => update("opening_hours", v)}
            />
          </div>
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <Label>Fermetures saisonnières</Label>
            <p className="text-xs text-slate-500">
              Périodes de fermeture annoncées (vacances, congés annuels, travaux).
            </p>
            <SeasonalClosuresEditor
              value={form.seasonal_closures}
              onChange={(v) => update("seasonal_closures", v)}
            />
          </div>
        </fieldset>

        {/* PLAN COMMERCIAL — admin uniquement */}
        {!isAdvertiser ? (
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plan commercial
          </legend>
          <div className="space-y-1">
            <Label htmlFor="plan">Formule</Label>
            <Select
              id="plan"
              value={form.plan}
              onChange={(e) => update("plan", e.target.value as BusinessPlan)}
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              {PLANS.find((p) => p.value === form.plan)?.help}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan_starts_at">Début</Label>
              <Input
                id="plan_starts_at"
                type="datetime-local"
                value={form.plan_starts_at}
                onChange={(e) => update("plan_starts_at", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan_ends_at">Fin</Label>
              <Input
                id="plan_ends_at"
                type="datetime-local"
                value={form.plan_ends_at}
                onChange={(e) => update("plan_ends_at", e.target.value)}
              />
            </div>
          </div>
          {isEdit && business?.owner ? (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              ℹ️ Stripe IDs gérés automatiquement par les webhooks (Lot E). Owner :{" "}
              <code>{business.owner_username ?? `id ${business.owner}`}</code>
            </p>
          ) : null}
        </fieldset>
        ) : null}

        {/* WORKFLOW & SEO */}
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isAdvertiser ? "SEO" : "Workflow & SEO"}
          </legend>
          {!isAdvertiser ? (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => update("is_published", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Fiche publiée (visible côté public)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => update("is_featured", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mise en avant (homepage, listings)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_local_producer}
                  onChange={(e) => update("is_local_producer", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Producteur local (visible dans Marchés &amp; producteurs)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_claimed}
                  onChange={(e) => update("is_claimed", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Fiche revendiquée par un commerçant
              </label>
            </>
          ) : (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              ℹ️ La publication de ta fiche est validée par l&apos;équipe
              geoclicMédia après vérification (généralement sous 24h ouvrées).
              Tu peux modifier ta fiche à tout moment, les changements seront
              visibles publiquement après validation.
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="meta_description">
              Meta description SEO ({form.meta_description.length}/160)
            </Label>
            <Input
              id="meta_description"
              maxLength={160}
              value={form.meta_description}
              onChange={(e) => update("meta_description", e.target.value)}
            />
          </div>
        </fieldset>
      </div>

    </form>
  );
}
