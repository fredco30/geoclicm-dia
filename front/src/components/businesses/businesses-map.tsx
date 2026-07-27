"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BusinessListItem } from "@/types/api";

type Props = {
  businesses: BusinessListItem[];
  /** Centre par défaut si aucun business avec coords (Camargue gardoise). */
  defaultCenter?: [number, number];
  defaultZoom?: number;
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function BusinessesMap({
  businesses,
  defaultCenter = [4.15, 43.55],
  defaultZoom = 10,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();

  // Filtre : uniquement fiches avec coords
  const geo = businesses.filter(
    (b): b is BusinessListItem & { latitude: number; longitude: number } =>
      b.latitude !== null && b.longitude !== null,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: OSM_STYLE,
      center: defaultCenter,
      zoom: defaultZoom,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;

    // Ajout des markers
    const markers: maplibregl.Marker[] = [];
    const bounds = new maplibregl.LngLatBounds();

    for (const b of geo) {
      const lngLat: [number, number] = [b.longitude, b.latitude];
      const isPremium = b.plan === "premium";
      const popupHtml = `
        <div style="min-width:160px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">
            ${escapeHtml(b.category_name)}
          </div>
          <div style="font-weight:600;color:#0f172a;font-family:Fraunces,serif;font-size:15px;line-height:1.2">
            ${escapeHtml(b.name)}
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">
            ${escapeHtml(b.commune_name)}${b.city && b.city !== b.commune_name ? " — " + escapeHtml(b.city) : ""}
          </div>
          <a href="/commerces/${b.slug}" data-business-link
             style="display:inline-block;margin-top:8px;font-size:12px;font-weight:500;color:#a8533a;text-decoration:underline">
            Voir la fiche →
          </a>
        </div>
      `;
      const popup = new maplibregl.Popup({ offset: 25, closeButton: true }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({
        color: isPremium ? "#a8533a" : "#1a4d6e",
      })
        .setLngLat(lngLat)
        .setPopup(popup)
        .addTo(map);

      markers.push(marker);
      bounds.extend(lngLat);
    }

    // Ajuster la vue sur l'ensemble des markers (si > 1)
    if (geo.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    } else if (geo.length === 1) {
      map.setCenter([geo[0].longitude, geo[0].latitude]);
      map.setZoom(14);
    }

    // Délégation : intercepter le clic sur les liens dans les popups
    // pour faire de la navigation Next.js client-side (sans rechargement).
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("[data-business-link]") as HTMLAnchorElement | null;
      if (link && link.href) {
        e.preventDefault();
        const url = new URL(link.href);
        router.push(url.pathname);
      }
    };
    container_addListener(container, onClick);

    return () => {
      container_removeListener(container, onClick);
      for (const m of markers) m.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses.length]); // re-monter si la liste change vraiment

  if (geo.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Aucun commerce géolocalisé pour l&apos;instant.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="aspect-[16/9] w-full overflow-hidden rounded-xl ring-1 ring-slate-200"
      role="region"
      aria-label="Carte des commerces du territoire"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function container_addListener(
  el: HTMLElement | null,
  fn: (e: MouseEvent) => void,
) {
  if (el) el.addEventListener("click", fn);
}
function container_removeListener(
  el: HTMLElement | null,
  fn: (e: MouseEvent) => void,
) {
  if (el) el.removeEventListener("click", fn);
}
