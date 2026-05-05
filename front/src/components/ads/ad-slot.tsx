"use client";

import { useEffect, useState } from "react";
import type { AdPlacement, AdServeResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = {
  placement: AdPlacement;
  /** Slug commune courante pour ciblage contextuel (page commune, fiche d'un commerce…). */
  communeSlug?: string;
  /** Slug catégorie courante pour ciblage contextuel (page catégorie). */
  categorySlug?: string;
  /** Classes additionnelles sur le wrapper externe. */
  className?: string;
};

/**
 * Encart publicitaire servi dynamiquement depuis /api/sponsors/serve/.
 *
 * URL côté API volontairement neutre (préfixe "sponsors" plutôt qu'"ads")
 * pour ne pas être bloquée par uBlock/AdBlock côté navigateur des
 * visiteurs. Le pattern /ads/ déclenche le filtrage par défaut de la
 * plupart des bloqueurs (30-40 % du trafic FR), ce qui rendrait les
 * encarts invisibles et casserait la promesse commerciale de la régie.
 *
 * Composant client : fetch au mount avec cache: no-store pour avoir une
 * rotation aléatoire à chaque visite (vs ISR qui figerait la même
 * campagne pour tous les visiteurs sur la fenêtre de revalidation).
 *
 * - Le clic passe par /r/<id>/ (incrémente click_count puis 302 vers
 *   target_url), avec rel="noopener sponsored" pour signaler à Google
 *   que c'est un lien publicitaire (préserve le PageRank du site).
 * - Mention « Publicité » discrète en haut conforme aux exigences
 *   ARPP/CSA pour le native advertising.
 * - Si aucune campagne active (204), ne rend rien (pas de placeholder
 *   « pub indisponible » qui polluerait l'UI).
 */
export function AdSlot({
  placement,
  communeSlug,
  categorySlug,
  className,
}: Props) {
  const [ad, setAd] = useState<AdServeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ placement });
    if (communeSlug) params.set("commune", communeSlug);
    if (categorySlug) params.set("category", categorySlug);

    let cancelled = false;
    fetch(`${API_URL}/api/sponsors/serve/?${params.toString()}`, {
      cache: "no-store",
      credentials: "omit",
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 204) {
          setAd(null);
        } else if (res.ok) {
          setAd((await res.json()) as AdServeResponse);
        }
      })
      .catch(() => {
        if (!cancelled) setAd(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [placement, communeSlug, categorySlug]);

  // Avant le premier fetch ou si pas de campagne servie : ne rien rendre
  if (!loaded || !ad) return null;

  return (
    <aside
      className={`overflow-hidden rounded-xl bg-white ring-1 ring-[#a8533a]/20 ${className ?? ""}`}
      aria-label="Encart publicitaire"
    >
      <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
        <span>Publicité</span>
        <span>{ad.business_name}</span>
      </div>
      <a
        href={`${API_URL}${ad.click_url}`}
        target="_blank"
        rel="noopener sponsored"
        className="group block"
      >
        {ad.image?.large ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.image.large}
            alt={ad.headline || ad.business_name}
            className="aspect-[16/9] w-full object-cover transition group-hover:opacity-95"
            loading="lazy"
          />
        ) : null}
        {ad.headline || ad.cta_text ? (
          <div className="p-3">
            {ad.headline ? (
              <p className="font-serif text-sm font-semibold text-slate-900">
                {ad.headline}
              </p>
            ) : null}
            {ad.cta_text ? (
              <span className="mt-2 inline-block rounded-md bg-[#a8533a] px-3 py-1 text-xs font-medium text-white transition group-hover:bg-[#8e4530]">
                {ad.cta_text} →
              </span>
            ) : null}
          </div>
        ) : null}
      </a>
    </aside>
  );
}
