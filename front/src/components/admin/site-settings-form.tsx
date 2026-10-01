"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HEX = /^#[0-9a-f]{6}$/i;

/** Contraste WCAG entre la couleur et du texte blanc (boutons, bandeaux). */
function contrastWithWhite(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}

function readCsrfToken(): string | null {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function ColorField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (sélecteur)`}
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-32 font-mono" maxLength={7} />
      </div>
      <p className="text-xs text-slate-500">{help}</p>
      {HEX.test(value) && contrastWithWhite(value) < 4.5 ? (
        <p className="text-xs font-medium text-amber-700">
          Couleur trop claire : le texte blanc des boutons sera difficile à lire.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Identité visuelle : nom, accroche, logo et couleurs du site. Les
 * variantes claires/foncées (survols) sont calculées automatiquement.
 */
export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    site_name: settings.site_name,
    tagline: settings.tagline,
    primary_color: settings.primary_color,
    accent_color: settings.accent_color,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : removeLogo ? null : settings.logo_url;
  const colorsValid = HEX.test(form.primary_color) && HEX.test(form.accent_color);
  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!colorsValid) {
      setMessage({ ok: false, text: "Les couleurs doivent être au format #RRGGBB." });
      return;
    }
    startTransition(async () => {
      let csrf = readCsrfToken();
      if (!csrf) {
        await apiFetch("/api/auth/csrf/");
        csrf = readCsrfToken();
      }
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append("logo", logoFile);
      else if (removeLogo) fd.append("logo", "");
      const res = await apiFetch("/api/site-settings/", {
        method: "PATCH",
        body: fd,
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: `Enregistrement impossible : ${JSON.stringify(data)}` });
        return;
      }
      setLogoFile(null);
      setRemoveLogo(false);
      setMessage({ ok: true, text: "Identité enregistrée. Le site public est mis à jour." });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Identité du site</h1>
          <p className="text-sm text-slate-500">Nom, logo et couleurs affichés sur le site et dans les espaces de gestion.</p>
        </div>
        <Button type="submit" disabled={isPending || !colorsValid}>
          <Save className="h-4 w-4" /> {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      {message ? (
        <p className={`rounded-md px-3 py-2 text-sm ring-1 ${message.ok ? "bg-green-50 text-green-900 ring-green-200" : "bg-red-50 text-red-800 ring-red-200"}`}>
          {message.text}
        </p>
      ) : null}

      <fieldset className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</legend>
        <div className="space-y-1">
          <Label htmlFor="site_name">Nom du site</Label>
          <Input id="site_name" required maxLength={60} value={form.site_name} onChange={(e) => update("site_name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tagline">Accroche</Label>
          <Input id="tagline" maxLength={120} value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
          <p className="text-xs text-slate-500">Affichée dans le titre de l&apos;onglet de l&apos;accueil.</p>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Logo</legend>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 min-w-16 items-center justify-center rounded-md bg-slate-50 px-3 ring-1 ring-slate-200">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Aperçu du logo" className="h-12 w-auto" />
            ) : (
              <span className="h-10 w-10 rounded-full" style={{ backgroundColor: form.primary_color }} aria-hidden />
            )}
          </div>
          <div className="space-y-2 text-sm">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setLogoFile(e.target.files?.[0] ?? null);
                setRemoveLogo(false);
              }}
            />
            {settings.logo_url && !logoFile ? (
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} />
                Retirer le logo (pastille de couleur à la place)
              </label>
            ) : null}
            <p className="text-xs text-slate-500">PNG à fond transparent conseillé, hauteur affichée ≈ 28 px (prévoir 112 px pour les écrans haute définition).</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Couleurs</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="primary_color" label="Couleur principale" help="Liens, boutons, en-têtes, menus." value={form.primary_color} onChange={(v) => update("primary_color", v)} />
          <ColorField id="accent_color" label="Couleur d'accent" help="Mises en avant, formule Premium, encarts." value={form.accent_color} onChange={(v) => update("accent_color", v)} />
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, primary_color: DEFAULT_SITE_SETTINGS.primary_color, accent_color: DEFAULT_SITE_SETTINGS.accent_color }))}
          className="inline-flex items-center gap-1 text-sm text-slate-600 underline hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Rétablir les couleurs d&apos;origine
        </button>

        {colorsValid ? (
          <div
            className="rounded-lg border border-slate-200 p-4"
            style={{ ["--brand-primary" as string]: form.primary_color, ["--brand-accent" as string]: form.accent_color }}
            aria-label="Aperçu"
          >
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Aperçu</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif text-lg font-semibold text-camargue">{form.site_name || "Nom du site"}</span>
              <span className="rounded-md bg-camargue px-3 py-1.5 text-sm font-medium text-white">Bouton</span>
              <span className="rounded-md bg-camargue-dark px-3 py-1.5 text-sm font-medium text-white">Survol</span>
              <span className="rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-white">Premium</span>
              <span className="rounded-full bg-camargue/10 px-3 py-1 text-sm text-camargue">Lien actif</span>
            </div>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
