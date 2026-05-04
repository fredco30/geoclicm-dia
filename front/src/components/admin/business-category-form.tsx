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
import type {
  AdminBusinessCategory,
  AdminBusinessCategoryPayload,
} from "@/types/admin";

type Props = {
  category?: AdminBusinessCategory; // undefined → mode création
  parents: AdminBusinessCategory[]; // catégories racines disponibles
};

const SCHEMA_TYPES = [
  "LocalBusiness",
  "Restaurant",
  "BarOrPub",
  "CafeOrCoffeeShop",
  "IceCreamShop",
  "FoodEstablishment",
  "Bakery",
  "GroceryStore",
  "Store",
  "ClothingStore",
  "JewelryStore",
  "HomeGoodsStore",
  "HomeAndConstructionBusiness",
  "Plumber",
  "Electrician",
  "HousePainter",
  "HealthAndBeautyBusiness",
  "HairSalon",
  "BeautySalon",
  "DaySpa",
  "SportsActivityLocation",
  "EntertainmentBusiness",
  "AmusementPark",
  "TouristInformationCenter",
  "LodgingBusiness",
  "Hotel",
  "Campground",
  "BedAndBreakfast",
  "ProfessionalService",
  "AutoRepair",
  "BankOrCreditUnion",
  "InsuranceAgency",
  "RealEstateAgent",
  "MedicalBusiness",
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function BusinessCategoryForm({ category, parents }: Props) {
  const router = useRouter();
  const isEdit = !!category;

  const [form, setForm] = useState<AdminBusinessCategoryPayload>({
    name: category?.name ?? "",
    parent: category?.parent ?? null,
    icon: category?.icon ?? "",
    description: category?.description ?? "",
    schema_type: category?.schema_type ?? "LocalBusiness",
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof AdminBusinessCategoryPayload>(
    k: K,
    v: AdminBusinessCategoryPayload[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit
      ? `/api/business-categories/${category!.slug}/`
      : `/api/business-categories/`;
    const method = isEdit ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(form),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        router.push("/admin/directory/categories");
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (
      !confirm(
        `Supprimer définitivement « ${category!.name} » ?\n\nLes commerçants liés à cette catégorie devront être réassignés.`,
      )
    )
      return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/business-categories/${category!.slug}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push("/admin/directory/categories");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          `Suppression impossible : ${JSON.stringify(data, null, 2)}\n\n(une catégorie qui a des sous-catégories ou des commerçants ne peut pas être supprimée)`,
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/directory/categories"
            className="text-sm text-slate-600 hover:text-[#1a4d6e]"
          >
            ← Catégories
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? `Éditer ${category!.name}` : "Nouvelle catégorie"}
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
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Identité
          </legend>
          <div className="space-y-1">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="parent">Catégorie parente</Label>
            <Select
              id="parent"
              value={form.parent ?? ""}
              onChange={(e) =>
                update("parent", e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Aucune (catégorie racine) —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              Laisser vide pour créer une catégorie racine.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="icon">Icône Lucide</Label>
            <Input
              id="icon"
              value={form.icon}
              onChange={(e) => update("icon", e.target.value)}
              placeholder="Ex: UtensilsCrossed, BedDouble, Hammer"
            />
            <p className="text-xs text-slate-500">
              Nom d&apos;icône depuis{" "}
              <a
                href="https://lucide.dev/icons/"
                target="_blank"
                rel="noopener"
                className="underline hover:text-[#1a4d6e]"
              >
                lucide.dev/icons
              </a>{" "}
              (CamelCase, sans suffixe).
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            SEO &amp; description
          </legend>
          <div className="space-y-1">
            <Label htmlFor="schema_type">Type schema.org</Label>
            <Input
              id="schema_type"
              list="schema-types"
              value={form.schema_type}
              onChange={(e) => update("schema_type", e.target.value)}
              placeholder="LocalBusiness"
            />
            <datalist id="schema-types">
              {SCHEMA_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500">
              Utilisé pour le balisage JSON-LD des fiches commerçants (SEO).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
              placeholder="Texte affiché sur la page de la catégorie (optionnel)"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Affichage
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sort_order">Ordre d&apos;affichage</Label>
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value) || 0)}
              />
              <p className="text-xs text-slate-500">
                Plus petit = affiché en premier.
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => update("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Catégorie active (visible côté public)
              </label>
            </div>
          </div>
        </fieldset>
      </div>
    </form>
  );
}
