/**
 * Geocoding via OpenStreetMap Nominatim (gratuit, ~1 req/s).
 *
 * Usage : saisie manuelle d'adresses commerçants en back-office (~10-100 fiches).
 * Si on industrialise (centaines de fiches/mois), passer par un proxy serveur
 * qui respecte le rate limit + User-Agent custom.
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  display_name: string;
};

/** Géocode une adresse libre (ex : "12 rue du port, 30240 Le Grau-du-Roi"). */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fr");
  url.searchParams.set("q", trimmed);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    return {
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
      display_name: first.display_name,
    };
  } catch {
    return null;
  }
}
