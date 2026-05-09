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

import type { Commune, UsefulContactKind, UsefulContactType } from "@/types/api";
import type {
  AdminUsefulContact,
  AdminUsefulContactPayload,
} from "@/types/admin";

type Props = {
  contact?: AdminUsefulContact; // undefined → création
  /** Détermine le `kind` créé par défaut quand on arrive depuis un onglet. */
  defaultKind?: UsefulContactKind;
  communes: Commune[];
};

const KIND_OPTIONS: { value: UsefulContactKind; label: string }[] = [
  { value: "useful_number", label: "Numéro utile" },
  { value: "procedure", label: "Démarche administrative" },
];

const TYPE_OPTIONS: {
  value: UsefulContactType;
  label: string;
  placeholder: string;
}[] = [
  { value: "phone", label: "Téléphone", placeholder: "ex: 04 66 51 35 05 ou 18" },
  { value: "url", label: "Lien externe", placeholder: "https://service-public.fr/..." },
  { value: "email", label: "Email", placeholder: "contact@mairie.fr" },
  { value: "address", label: "Adresse", placeholder: "Place de la Mairie, 30240 Le Grau-du-Roi" },
  { value: "info", label: "Info simple", placeholder: "Information texte libre" },
];

const SUGGESTED_CATEGORIES_USEFUL = [
  "Urgences", "Santé", "Sécurité", "Mairies",
  "Office de tourisme", "Capitainerie", "Services publics",
];
const SUGGESTED_CATEGORIES_PROCEDURE = [
  "État civil", "Identité", "Urbanisme", "Logement",
  "Famille", "Véhicule", "Environnement",
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function UsefulContactForm({ contact, defaultKind, communes }: Props) {
  const router = useRouter();
  const isEdit = !!contact;

  const [form, setForm] = useState<AdminUsefulContactPayload>({
    kind: contact?.kind ?? defaultKind ?? "useful_number",
    label: contact?.label ?? "",
    contact_type: contact?.contact_type ?? "phone",
    value: contact?.value ?? "",
    description: contact?.description ?? "",
    category_label: contact?.category_label ?? "",
    commune: contact?.commune ?? null,
    sort_order: contact?.sort_order ?? 100,
    is_active: contact?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedCommunes = [...communes].sort((a, b) => a.sort_order - b.sort_order);
  const update = <K extends keyof AdminUsefulContactPayload>(
    k: K,
    v: AdminUsefulContactPayload[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const currentType = TYPE_OPTIONS.find((t) => t.value === form.contact_type);
  const suggestions =
    form.kind === "useful_number"
      ? SUGGESTED_CATEGORIES_USEFUL
      : SUGGESTED_CATEGORIES_PROCEDURE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError("Le libellé est obligatoire.");
      return;
    }
    if (!form.value.trim()) {
      setError("La valeur est obligatoire (numéro, URL, email, etc.).");
      return;
    }

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit
      ? `/api/admin/utility/contacts/${contact!.id}/`
      : "/api/admin/utility/contacts/";
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
        // Redirection vers la liste filtrée par le kind courant
        router.push(`/admin/utility?kind=${form.kind}`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement « ${contact!.label} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(
        `/api/admin/utility/contacts/${contact!.id}/`,
        {
          method: "DELETE",
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        },
      );
      if (!res.ok) {
        setError("Erreur lors de la suppression.");
        return;
      }
      router.push(`/admin/utility?kind=${form.kind}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {isEdit
            ? `Édition : ${contact!.label}`
            : "Nouvelle entrée pratique"}
        </h1>
        <Link
          href={`/admin/utility?kind=${form.kind}`}
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
          <Label htmlFor="kind">Type *</Label>
          <Select
            id="kind"
            value={form.kind}
            onChange={(e) => update("kind", e.target.value as UsefulContactKind)}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Détermine sur quelle page publique cette entrée s&apos;affiche
            (/numeros-utiles ou /demarches).
          </p>
        </div>

        <div>
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            value={form.label}
            onChange={(e) => update("label", e.target.value)}
            placeholder="ex: Pompiers / Refaire sa carte d'identité"
            required
          />
        </div>

        <div>
          <Label htmlFor="category_label">Section (groupage)</Label>
          <Input
            id="category_label"
            value={form.category_label}
            onChange={(e) => update("category_label", e.target.value)}
            placeholder="ex: Urgences"
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            Texte libre. Les entrées qui partagent la même section sont
            regroupées sous un même titre. Suggestions :{" "}
            {suggestions.slice(0, 4).join(", ")}…
          </p>
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Contact
        </legend>

        <div>
          <Label htmlFor="contact_type">Type de contact *</Label>
          <Select
            id="contact_type"
            value={form.contact_type}
            onChange={(e) =>
              update("contact_type", e.target.value as UsefulContactType)
            }
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="value">Valeur *</Label>
          <Input
            id="value"
            value={form.value}
            onChange={(e) => update("value", e.target.value)}
            placeholder={currentType?.placeholder ?? ""}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            {form.contact_type === "phone" &&
              "Numéro brut. Le bouton « tel: » sera généré automatiquement (cliquable sur mobile)."}
            {form.contact_type === "url" &&
              "URL complète avec http:// ou https://. Ouvre dans un nouvel onglet."}
            {form.contact_type === "email" &&
              "Email simple. Le bouton « mailto: » sera généré automatiquement."}
            {form.contact_type === "address" &&
              "Texte libre. Pas cliquable — l'utilisateur copie/colle dans son GPS."}
            {form.contact_type === "info" && "Info texte brut, non cliquable."}
          </p>
        </div>

        <div>
          <Label htmlFor="description">Description (optionnel)</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
            placeholder="Précisions : horaires, conditions, consignes…"
          />
        </div>
      </fieldset>

      {/* Localisation + ordre */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Localisation & ordre
        </legend>

        <div>
          <Label htmlFor="commune">Commune (optionnel)</Label>
          <Select
            id="commune"
            value={form.commune ?? ""}
            onChange={(e) =>
              update("commune", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">— Toutes les communes (entrée territoriale) —</option>
            {sortedCommunes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Choisir une commune si l&apos;entrée est locale (ex: la mairie de
            tel village). Sinon laisser vide pour qu&apos;elle s&apos;affiche
            sur tout le territoire.
          </p>
        </div>

        <div>
          <Label htmlFor="sort_order">Ordre d&apos;affichage</Label>
          <Input
            id="sort_order"
            type="number"
            value={form.sort_order}
            onChange={(e) => update("sort_order", Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-slate-500">
            Plus petit = affiché en premier dans sa section. Par défaut 100,
            laisser tel quel sauf cas particulier.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
          />
          <span>
            <strong>Active</strong> — décoche pour masquer sans supprimer.
          </span>
        </label>
      </fieldset>

      {error ? (
        <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'entrée"}
        </Button>

        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        ) : null}
      </div>
    </form>
  );
}
