"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  latitude: number;
  longitude: number;
  zoom?: number;
  label?: string;
};

// Style minimaliste : tuiles raster OpenStreetMap (libre, sans clé API).
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

export function BusinessMiniMap({
  latitude,
  longitude,
  zoom = 16,
  label,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [longitude, latitude],
      zoom,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const popup = label
      ? new maplibregl.Popup({ offset: 25, closeButton: false }).setText(label)
      : undefined;

    new maplibregl.Marker({ color: "#a8533a" })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // monté une seule fois — la fiche est statique côté serveur

  return (
    <div
      ref={containerRef}
      className="aspect-[4/3] w-full overflow-hidden rounded-lg ring-1 ring-slate-200"
      role="region"
      aria-label="Carte de localisation du commerce"
    />
  );
}
