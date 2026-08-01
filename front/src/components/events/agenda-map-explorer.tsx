/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Navigation, X } from "lucide-react";
import maplibregl, { type Marker, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { EventListItem } from "@/types/api";

type Props = { events: EventListItem[]; initialSelectedSlug?: string };

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' } },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

function formatDate(value?: string): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value));
}

export function AgendaMapExplorer({ events, initialSelectedSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(initialSelectedSlug ?? events[0]?.slug);
  const selected = useMemo(() => events.find((event) => event.slug === selectedSlug) ?? null, [events, selectedSlug]);

  const selectEvent = (event: EventListItem) => {
    setSelectedSlug(event.slug);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("event", event.slug);
      window.history.replaceState(window.history.state, "", url);
    }
    if (event.longitude !== null && event.latitude !== null) mapRef.current?.flyTo({ center: [event.longitude, event.latitude], zoom: Math.max(mapRef.current.getZoom(), 13), essential: true });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({ container, style: OSM_STYLE, center: [4.15, 43.55], zoom: 10, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    const bounds = new maplibregl.LngLatBounds();
    for (const event of events) {
      if (event.longitude === null || event.latitude === null) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition hover:scale-110";
      button.style.backgroundColor = event.category.color || "#a8533a";
      button.setAttribute("aria-label", `Voir ${event.title}`);
      button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"/></svg>';
      button.addEventListener("click", () => selectEvent(event));
      markersRef.current.push(new maplibregl.Marker({ element: button }).setLngLat([event.longitude, event.latitude]).addTo(map));
      bounds.extend([event.longitude, event.latitude]);
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: { top: 55, right: 390, bottom: 75, left: 55 }, maxZoom: 13 });
    return () => { markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; map.remove(); mapRef.current = null; };
  // events are replaced only after a server-side filter navigation.
  }, [events]);

  if (events.length === 0) return null;

  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[440px]">
          <div ref={containerRef} className="absolute inset-0" role="region" aria-label="Carte des événements" />
          {selected ? <EventWindow event={selected} onClose={() => setSelectedSlug(undefined)} /> : null}
        </div>
        <aside className="max-h-[620px] overflow-y-auto border-t border-slate-200 bg-[#fffdf8] lg:border-l lg:border-t-0" aria-label="Événements sur la carte">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"><strong>{events.length} événement{events.length > 1 ? "s" : ""} géolocalisé{events.length > 1 ? "s" : ""}</strong></div>
          <div className="divide-y divide-slate-200">{events.map((event) => <button key={event.id} type="button" onClick={() => selectEvent(event)} className={`w-full px-4 py-4 text-left transition hover:bg-white ${selected?.id === event.id ? "bg-white ring-1 ring-inset ring-[#a8533a]/30" : ""}`}><div className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.category.color }} /><span><span className="block font-semibold text-slate-900">{event.title}</span><span className="mt-1 block text-xs text-[#a8533a]">{formatDate(event.next_occurrence?.starts_at)}</span><span className="mt-1 block text-xs text-slate-500">{event.venue_name || event.commune_name}</span></span></div></button>)}</div>
        </aside>
      </div>
    </section>
  );
}

function EventWindow({ event, onClose }: { event: EventListItem; onClose: () => void }) {
  const directions = event.latitude !== null && event.longitude !== null ? `https://www.openstreetmap.org/directions?to=${event.latitude}%2C${event.longitude}` : null;
  return <article className="absolute bottom-4 left-4 right-4 z-10 max-h-[82%] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:right-auto sm:w-[390px]" aria-live="polite">
    <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-2 text-slate-700 shadow" aria-label="Fermer"><X className="h-4 w-4" /></button>
    {event.cover_image?.large || event.cover_image?.medium ? <img src={event.cover_image.large ?? event.cover_image.medium ?? ""} alt="" className="h-44 w-full object-cover" /> : <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#1a4d6e]/15 to-[#a8533a]/20"><CalendarDays className="h-10 w-10 text-[#1a4d6e]" /></div>}
    <div className="p-4"><span className="rounded-full px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: event.category.color }}>{event.category.name}</span><h2 className="mt-3 font-serif text-2xl font-semibold leading-tight text-slate-900">{event.title}</h2>
    <p className="mt-3 flex gap-2 text-sm font-medium text-[#a8533a]"><CalendarDays className="h-4 w-4 shrink-0" />{formatDate(event.next_occurrence?.starts_at)}</p>
    <p className="mt-2 flex gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0" />{[event.venue_name, event.address, event.commune_name].filter(Boolean).join(", ")}</p>
    {event.short_description ? <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-700">{event.short_description}</p> : null}
    <div className="mt-4 grid grid-cols-2 gap-2">{directions ? <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"><Navigation className="h-4 w-4" /> Itinéraire</a> : <span />}<Link href={`/agenda/${event.slug}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123b5d] px-3 py-2 text-sm font-semibold text-white">Détails <ExternalLink className="h-4 w-4" /></Link></div>
    {event.official_url ? <a href={event.official_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#a8533a] px-3 py-2 text-sm font-semibold text-white">Ouvrir le site officiel <ExternalLink className="h-4 w-4" /></a> : null}
    {event.source_label ? <p className="mt-2 text-center text-[11px] text-slate-400">Source : {event.source_label}</p> : null}</div>
  </article>;
}
