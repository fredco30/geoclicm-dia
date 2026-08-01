"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import type { AdServeResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = {
  communeSlug?: string;
};

function formatFeaturedDate(value?: string): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

/**
 * Bandeau "Agenda — À la une" (emplacement premium monétisé).
 *
 * Consomme /api/sponsors/serve/?placement=agenda_featured. Deux modes :
 * - campagne avec featured_event : on affiche la fiche de l'événement mis en
 *   avant (image, titre, date, lieu) ; le clic passe par /r/<id>/ qui
 *   incrémente click_count puis redirige vers /agenda/<slug>.
 * - campagne sans featured_event : repli sur la créa classique (image +
 *   headline + CTA, lien externe tracké).
 *
 * Si aucune campagne active sur ce placement (204) : ne rend rien. C'est ce
 * qui permet à l'admin de "ne pas l'afficher" (pas de campagne active).
 */
export function AgendaFeatured({ communeSlug }: Props) {
  const [ad, setAd] = useState<AdServeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ placement: "agenda_featured" });
    if (communeSlug) params.set("commune", communeSlug);

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
  }, [communeSlug]);

  if (!loaded || !ad) return null;

  const event = ad.featured_event ?? null;
  const clickUrl = `${API_URL}${ad.click_url}`;

  return (
    <aside
      className="mb-7 overflow-hidden rounded-2xl bg-white ring-1 ring-[#a8533a]/25"
      aria-label="Événement à la une"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
        <span>À la une · Publicité</span>
        <span>Présenté par {ad.business_name}</span>
      </div>

      <a
        href={clickUrl}
        target="_blank"
        rel="noopener sponsored"
        className="group flex gap-4 p-3 sm:p-4"
      >
        {event ? (
          <>
            {event.cover_image?.medium || event.cover_image?.large ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image.medium ?? event.cover_image.large ?? ""}
                alt={event.title}
                className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                loading="lazy"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a4d6e]/15 to-[#a8533a]/20 sm:h-28 sm:w-28">
                <CalendarDays className="h-8 w-8 text-[#1a4d6e]" />
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:text-lg">
                {event.title}
              </span>
              <span className="mt-1 block text-xs font-medium text-[#a8533a] sm:text-sm">
                {formatFeaturedDate(event.next_occurrence?.starts_at)}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-600 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {[event.venue_name, event.commune_name].filter(Boolean).join(" · ")}
                </span>
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
              <span className="mt-2 block font-serif text-base font-semibold text-slate-900">
                {ad.headline}
              </span>
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
