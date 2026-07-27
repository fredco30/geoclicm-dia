"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { TILE_COLOR_PRESETS } from "@/lib/tile-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TileIconPicker } from "@/components/admin/tile-icon-picker";

import type { Commune } from "@/types/api";
import type { AdminTile, AdminTilePayload, TileColorPreset, TileKind, TileModuleKey } from "@/types/admin";

type Props = {
  tile?: AdminTile; // undefined → création
  rootTiles: AdminTile[]; // pour le sélecteur de parent
  communes: Commune[];
};

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function TileForm({ tile, rootTiles, communes }: Props) {
  const router = useRouter();
  const isEdit = !!tile;

  const [form, setForm] = useState<AdminTilePayload>({
    parent: tile?.parent ?? null,
    label: tile?.label ?? "",
    icon: tile?.icon ?? "",
    color: tile?.color ?? "camargue",
    kind: tile?.kind ?? "internal_route",
    internal_path: tile?.internal_path ?? "",
    external_url: tile?.external_url ?? "",
    module_key: tile?.module_key ?? "",
    sort_order: tile?.sort_order ?? 100,
    is_active: tile?.is_active ?? true,
    show_on_home: tile?.show_on_home ?? true,
    visible_on_communes: tile?.visible_on_communes ?? [],
    span_2x: tile?.span_2x ?? false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof AdminTilePayload>(k: K, v: AdminTilePayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sortedCommunes = [...communes].sort((a, b) => a.sort_order - b.sort_order);

  const preset = TILE_COLOR_PRESETS[form.color];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError("Le libellé est obligatoire.");
      return;
    }

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit ? `/api/admin/tiles/${tile!.id}/` : "/api/admin/tiles/";
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
        const saved = (await res.json()) as { id: number };
        router.push(`/admin/tiles/${saved.id}/edit`);
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`Supprimer définitivement la tuile « ${tile!.label} » ?`))
      return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/admin/tiles/${tile!.id}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (!res.ok) {
        setError("Erreur lors de la suppression.");
        return;
      }
      router.push("/admin/tiles");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {isEdit ? `Tuile : ${tile!.label}` : "Nouvelle tuile"}
        </h1>
        <Link
          href="/admin/tiles"
          className="text-sm text-slate-600 hover:text-[#1a4d6e]"
        >
          ← Retour à la liste
        </Link>
      </div>

      {/* Aperçu live */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
          Aperçu
        </p>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl ${preset.bg} ${preset.text} text-xs font-medium`}
          >
            {form.icon ? (
              <span className="text-[10px] opacity-70">{form.icon}</span>
            ) : null}
            <span className="px-2 text-center text-[11px] leading-tight">
              {form.label || "Libellé"}
            </span>
          </span>
          <div className="text-xs text-slate-600">
            <p>Couleur : <strong>{preset.label}</strong></p>
            <p>
              Type :{" "}
              <strong>
                {form.kind === "internal_route" ? "Lien interne" :
                 form.kind === "external_url" ? "Lien externe" :
                 form.kind === "module" ? `Module ${form.module_key}` : ""}
              </strong>
            </p>
            <p>
              Cible : <code className="text-[11px]">{previewTarget(form)}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Identité */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Identité
        </legend>

        <div>
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            value={form.label}
            onChange={(e) => update("label", e.target.value)}
            required
            placeholder="ex: Actualités"
          />
        </div>

        <div>
          <Label htmlFor="parent">Tuile parente</Label>
          <Select
            id="parent"
            value={form.parent ?? ""}
            onChange={(e) =>
              update("parent", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">— Tuile racine (apparaît sur la home) —</option>
            {rootTiles
              .filter((t) => t.id !== tile?.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Si tu choisis une tuile parente, celle-ci devient une <strong>sous-tuile</strong>{" "}
            qui s&apos;affiche au clic sur la racine.
          </p>
        </div>

        <div>
          <Label>Icône</Label>
          <TileIconPicker
            value={form.icon}
            onChange={(v) => update("icon", v)}
          />
        </div>

        <div>
          <Label htmlFor="color">Couleur de fond</Label>
          <Select
            id="color"
            value={form.color}
            onChange={(e) => update("color", e.target.value as TileColorPreset)}
          >
            {Object.entries(TILE_COLOR_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      {/* Action au clic */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Action au clic
        </legend>

        <div>
          <Label htmlFor="kind">Type</Label>
          <Select
            id="kind"
            value={form.kind}
            onChange={(e) => update("kind", e.target.value as TileKind)}
          >
            <option value="internal_route">Lien interne (route du site)</option>
            <option value="external_url">Lien externe (URL hors site)</option>
            <option value="module">Module spécial (Actualités / Météo / Commerçants)</option>
          </Select>
        </div>

        {form.kind === "internal_route" ? (
          <div>
            <Label htmlFor="internal_path">Chemin interne *</Label>
            <Input
              id="internal_path"
              value={form.internal_path}
              onChange={(e) => update("internal_path", e.target.value)}
              placeholder="/agenda"
            />
            <p className="mt-1 text-xs text-slate-500">
              Commence toujours par <code>/</code>. Ex: <code>/categories/reportages</code>
            </p>
          </div>
        ) : null}

        {form.kind === "external_url" ? (
          <div>
            <Label htmlFor="external_url">URL externe *</Label>
            <Input
              id="external_url"
              type="url"
              value={form.external_url}
              onChange={(e) => update("external_url", e.target.value)}
              placeholder="https://www.le-grau-du-roi.fr"
            />
            <p className="mt-1 text-xs text-slate-500">
              Le lien s&apos;ouvrira dans un nouvel onglet, avec une icône
              indiquant la sortie du site (transparence).
            </p>
          </div>
        ) : null}

        {form.kind === "module" ? (
          <div>
            <Label htmlFor="module_key">Module *</Label>
            <Select
              id="module_key"
              value={form.module_key}
              onChange={(e) => update("module_key", e.target.value as TileModuleKey)}
            >
              <option value="">— Choisir —</option>
              <option value="news">Actualités (articles)</option>
              <option value="weather">Météo & mer</option>
              <option value="businesses">Commerçants</option>
            </Select>
          </div>
        ) : null}
      </fieldset>

      {/* Affichage */}
      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">
          Affichage
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sort_order">Ordre</Label>
            <Input
              id="sort_order"
              type="number"
              value={form.sort_order}
              onChange={(e) => update("sort_order", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Plus petit = affiché en premier. Conseil : laisser des écarts
              (10, 20, 30…) pour insérer plus tard.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            <span>
              <strong>Active</strong> — décocher pour masquer temporairement la tuile
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.show_on_home}
              onChange={(e) => update("show_on_home", e.target.checked)}
            />
            <span>
              <strong>Visible sur la home globale</strong> — sinon uniquement sur
              les pages commune sélectionnées
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.span_2x}
              onChange={(e) => update("span_2x", e.target.checked)}
            />
            <span>
              <strong>Tuile large</strong> — occupe 2 colonnes dans la grille
            </span>
          </label>
        </div>

        <div>
          <Label>Communes où la tuile est visible</Label>
          <p className="mb-2 text-xs text-slate-500">
            Vide = visible partout (home + toutes les pages commune). Coche
            une ou plusieurs communes pour limiter à elles.
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {sortedCommunes.map((c) => {
              const checked = form.visible_on_communes.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.visible_on_communes, c.id]
                        : form.visible_on_communes.filter((id) => id !== c.id);
                      update("visible_on_communes", next);
                    }}
                  />
                  <span>{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      {error ? (
        <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la tuile"}
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

function previewTarget(form: AdminTilePayload): string {
  if (form.kind === "internal_route") return form.internal_path || "—";
  if (form.kind === "external_url") return form.external_url || "—";
  if (form.kind === "module") {
    const map: Record<string, string> = {
      news: "/articles",
      weather: "/meteo",
      businesses: "/commerces",
    };
    return form.module_key ? map[form.module_key] : "—";
  }
  return "—";
}
