"use client";

import { useEffect, useState } from "react";
import { MapPin, Store } from "lucide-react";

import type { AdServeResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = {
  communeSlug?: string;
  categorySlug?: string;
};

/**
 * Bandeau "Annuaire — À la une" (emplacement premium monétisé).
 *
 * Consomme /api/sponsors/serve/?placement=directory_featured. Si la campagne
 * a un featured_business : on affiche sa fiche (logo, nom, catégorie,
 * commune) ; le clic passe par /r/<id>/ puis redirige vers /commerces/<slug>.
 * Sinon repli sur la créa classique (image + headline + CTA).
 * Aucune campagne active (204) → ne rend rien.
 */
export function DirectoryFeatured({ communeSlug, categorySlug }: Props) {
  const [ad, setAd] = useState<AdServeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ placement: "directory_featured" });
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
  }, [communeSlug, categorySlug]);

  if (!loaded || !ad) return null;

  const business = ad.featured_business ?? null;
  const clickUrl = `${API_URL}${ad.click_url}`;

  return (
    <aside
      className="mb-6 overflow-hidden rounded-2xl bg-white ring-1 ring-[#a8533a]/25"
      aria-label="Commerçant à la une"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
        <span>À la une · Publicité</span>
        <span>Présenté par {ad.business_name}</span>
      </div>

      <a href={clickUrl} target="_blank" rel="noopener sponsored" className="group flex gap-4 p-3 sm:p-4">
        {business ? (
          <>
            {business.logo?.medium || business.logo?.large ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo.medium ?? business.logo.large ?? ""}
                alt={business.name}
                className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                loading="lazy"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a4d6e]/15 to-[#a8533a]/20 sm:h-28 sm:w-28">
                <Store className="h-8 w-8 text-[#1a4d6e]" />
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:text-lg">
                {business.name}
              </span>
              <span className="mt-1 block text-xs font-medium text-[#a8533a] sm:text-sm">
                {business.category_name}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-600 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{business.commune_name}</span>
              </span>
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1">
            {ad.image?.large ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image.large}
                alt={ad.headline || ad.business_name}
                className="aspect-[16/9] w-full rounded-xl object-cover"
                loading="lazy"
              />
            ) : null}
            {ad.headline ? (
              <span className="mt-2 block font-serif text-base font-semibold text-slate-900">{ad.headline}</span>
            ) : null}
            {ad.cta_text ? (
              <span className="mt-2 inline-block rounded-md bg-[#a8533a] px-3 py-1 text-xs font-medium text-white transition group-hover:bg-[#8e4530]">
                {ad.cta_text} →
              </span>
            ) : null}
          </span>
        )}
      </a>
    </aside>
  );
}
