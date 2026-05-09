import { MapPin, Navigation } from "lucide-react";

type Props = {
  /** Latitude (string décimale renvoyée par l'API) ou number. */
  latitude: string | number | null | undefined;
  /** Longitude (string décimale renvoyée par l'API) ou number. */
  longitude: string | number | null | undefined;
  /** Label optionnel utilisé dans l'aria-label. */
  label?: string;
};

/**
 * Boutons de deep-link Maps + Waze pour une citation géolocalisée.
 *
 * - Google Maps : `?q=lat,lng` (localisation + recherche, ouvre l'app
 *   mobile native quand installée).
 * - Waze : `?ll=lat,lng` (localisation simple, l'utilisateur déclenche
 *   l'itinéraire). Pas de `&navigate=yes` en V1 — on évite de forcer le
 *   GPS sans confirmation utilisateur.
 *
 * Renvoie `null` si lat/lng manque ou est invalide (chunk textuel sans
 * coordonnées : mairie crawlée, article éditorial sans location, etc.).
 */
export function MapsLinks({ latitude, longitude, label }: Props) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  if (lat === null || lng === null) return null;

  // Coords formatées avec 6 décimales (~10cm de précision, suffisant
  // pour des POI et plus court dans l'URL).
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  const mapsUrl = `https://www.google.com/maps?q=${latStr},${lngStr}`;
  const wazeUrl = `https://www.waze.com/ul?ll=${latStr},${lngStr}`;
  const aria = label ? ` (${label})` : "";

  return (
    <span className="ml-1 inline-flex shrink-0 items-center gap-1">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir dans Google Maps${aria}`}
        title="Ouvrir dans Google Maps"
        className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-[#1a4d6e]/10 hover:text-[#1a4d6e]"
      >
        <MapPin className="h-3 w-3" aria-hidden />
        Maps
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir dans Waze${aria}`}
        title="Ouvrir dans Waze"
        className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-[#1a4d6e]/10 hover:text-[#1a4d6e]"
      >
        <Navigation className="h-3 w-3" aria-hidden />
        Waze
      </a>
    </span>
  );
}

function parseCoord(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  // Coordonnées WGS84 plausibles : lat ∈ [-90,90], lng ∈ [-180,180].
  // On laisse passer la borne max ; le caller protège déjà via
  // l'absence de valeur. Pas de garde stricte ici.
  return n;
}
