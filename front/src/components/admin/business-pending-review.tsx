"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Commune } from "@/types/api";
import type { AdminBusinessCategory, AdminBusinessDetail } from "@/types/admin";

const LABELS: Record<string, string> = {
  name: "Nom", legal_name: "Raison sociale", siret: "SIRET", category: "Catégorie",
  secondary_categories: "Catégories secondaires", short_description: "Description courte",
  description: "Description", specialties: "Spécialités", logo: "Logo",
  cover_image: "Image de couverture", address: "Adresse", address_complement: "Complément d'adresse",
  postal_code: "Code postal", city: "Ville", latitude: "Latitude", longitude: "Longitude",
  commune: "Commune", service_areas: "Communes desservies", phone: "Téléphone", mobile: "Mobile",
  email: "Email", website: "Site web", facebook_url: "Facebook", instagram_url: "Instagram",
  tiktok_url: "TikTok", opening_hours: "Horaires", seasonal_closures: "Fermetures saisonnières",
  meta_description: "Description SEO",
};

function readCsrfToken(): string | null {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Relecture des modifications proposées par l'annonceur sur une fiche
 * publiée : comparaison « en ligne / proposé », puis application ou refus.
 */
export function BusinessPendingReview({
  business,
  categories,
  communes,
}: {
  business: AdminBusinessDetail;
  categories: AdminBusinessCategory[];
  communes: Commune[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const review = business.pending_review;
  if (!review) return null;

  const categoryName = (id: unknown) => categories.find((c) => c.id === id)?.name ?? String(id);
  const communeName = (id: unknown) => communes.find((c) => c.id === id)?.name ?? String(id);
  const current = business as unknown as Record<string, unknown>;

  const show = (key: string, value: unknown, side: "current" | "proposed"): React.ReactNode => {
    if (key === "logo" || key === "cover_image") {
      const url =
        side === "proposed"
          ? key === "logo" ? review.logo_url : review.cover_image_url
          : (value as { medium?: string | null } | null)?.medium;
      if (side === "proposed" && value === null) return <em>Image supprimée</em>;
      // eslint-disable-next-line @next/next/no-img-element
      return url ? <img src={url} alt="" className="h-16 w-auto rounded" /> : <em>—</em>;
    }
    if (key === "category") return side === "current" ? (value as { name?: string })?.name : categoryName(value);
    if (key === "commune") return communeName(value);
    if (key === "secondary_categories" || key === "service_areas") {
      const ids = side === "current"
        ? ((value as { id: number }[] | undefined) ?? []).map((c) => c.id)
        : ((value as number[] | undefined) ?? []);
      const name = key === "service_areas" ? communeName : categoryName;
      return ids.map(name).join(", ") || "—";
    }
    if (Array.isArray(value)) return value.length && typeof value[0] === "object" ? <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 1)}</pre> : value.join(", ") || "—";
    if (value && typeof value === "object") return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 1)}</pre>;
    return value === null || value === undefined || value === "" ? "—" : String(value);
  };

  const run = (action: "apply-pending" | "discard-pending") => {
    if (action === "discard-pending" && !confirm("Refuser ces modifications ? La version en ligne est conservée.")) return;
    setError(null);
    startTransition(async () => {
      let csrf = readCsrfToken();
      if (!csrf) {
        await apiFetch("/api/auth/csrf/");
        csrf = readCsrfToken();
      }
      const res = await apiFetch(`/api/businesses/${business.slug}/${action}/`, {
        method: "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(JSON.stringify(data));
        return;
      }
      router.refresh();
    });
  };

  const rows = Object.entries(review.changes).filter(([key, proposed]) => {
    if (key === "logo" || key === "cover_image") return true;
    const now = current[key];
    if (key === "category") return (now as { id?: number })?.id !== proposed;
    return JSON.stringify(now ?? "") !== JSON.stringify(proposed ?? "");
  });

  return (
    <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-labelledby="pending-review-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="pending-review-title" className="font-semibold text-amber-950">
          Modifications proposées par le commerçant
          {review.submitted_at ? (
            <span className="ml-2 text-sm font-normal text-amber-800">
              le {new Date(review.submitted_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
            </span>
          ) : null}
        </h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => run("discard-pending")} disabled={isPending}>
            <X className="h-4 w-4" /> Refuser
          </Button>
          <Button type="button" size="sm" onClick={() => run("apply-pending")} disabled={isPending}>
            <Check className="h-4 w-4" /> Publier les modifications
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-amber-900">Aucune différence avec la version en ligne.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-amber-200">
          <table className="w-full text-sm">
            <thead className="bg-amber-100/60 text-left text-xs uppercase text-amber-900">
              <tr>
                <th className="px-3 py-2">Champ</th>
                <th className="px-3 py-2">En ligne</th>
                <th className="px-3 py-2">Proposé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 align-top">
              {rows.map(([key, proposed]) => (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium text-slate-700">{LABELS[key] ?? key}</td>
                  <td className="px-3 py-2 text-slate-500">{show(key, current[key], "current")}</td>
                  <td className="px-3 py-2 text-slate-900">{show(key, proposed, "proposed")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
