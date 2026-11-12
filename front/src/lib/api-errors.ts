/**
 * Transforme une réponse d'erreur de l'API (format Django REST Framework)
 * en message lisible par une personne non technique.
 *
 *   { "title": ["Ce champ est obligatoire."] }  →  « Titre : Ce champ est obligatoire. »
 *   { "detail": "Introuvable." }                →  « Introuvable. »
 */

const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  name: "Nom",
  label: "Libellé",
  slug: "Adresse web (slug)",
  chapeau: "Chapeau",
  body: "Corps de l'article",
  category: "Catégorie",
  commune: "Commune",
  article_type: "Type",
  kind: "Type",
  status: "Statut",
  cover_image: "Image de couverture",
  image: "Image",
  logo: "Logo",
  short_description: "Description courte",
  description: "Description",
  address: "Adresse",
  postal_code: "Code postal",
  city: "Ville",
  venue_name: "Lieu",
  phone: "Téléphone",
  mobile: "Mobile",
  email: "Email",
  website: "Site web",
  url: "Adresse web",
  seed_url: "Adresse web",
  official_url: "Site officiel",
  booking_url: "Lien de réservation",
  target_url: "Lien de destination",
  external_url: "Lien externe",
  headline: "Accroche",
  placement: "Emplacement",
  start_date: "Date de début",
  end_date: "Date de fin",
  starts_at: "Début",
  ends_at: "Fin",
  occurrences: "Dates",
  opening_hours: "Horaires",
  meta_title: "Titre SEO",
  meta_description: "Description SEO",
  sponsor: "Commerçant sponsor",
  business: "Commerce",
  siret: "SIRET",
  username: "Identifiant",
  password: "Mot de passe",
  first_name: "Prénom",
  last_name: "Nom",
  role: "Rôle",
  price: "Tarif",
};

/** Clés sans libellé : le message se suffit à lui-même. */
const BARE_KEYS = new Set(["detail", "non_field_errors", "error", "message"]);

function labelFor(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function collect(value: unknown, prefix: string, out: string[]): void {
  if (value == null || value === "") return;
  if (typeof value !== "object") {
    out.push(prefix ? `${prefix} : ${value}` : String(value));
    return;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) {
      const text = value.filter((item) => item != null && item !== "").join(" ");
      if (text) out.push(prefix ? `${prefix} : ${text}` : text);
      return;
    }
    // Liste d'objets (ex. une erreur par date) : on numérote les lignes fautives.
    value.forEach((item, index) => {
      collect(item, prefix ? `${prefix} n° ${index + 1}` : `Ligne ${index + 1}`, out);
    });
    return;
  }
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const label = BARE_KEYS.has(key) ? prefix : prefix ? `${prefix} — ${labelFor(key)}` : labelFor(key);
    collect(inner, label, out);
  }
}

export function formatApiError(data: unknown, fallback = "Enregistrement impossible."): string {
  // Page d'erreur HTML (500, proxy) : jamais affichée telle quelle.
  if (typeof data === "string") {
    return data.trim() && !data.trimStart().startsWith("<") ? data.trim() : fallback;
  }
  const lines: string[] = [];
  collect(data, "", lines);
  return lines.length ? lines.join("\n") : fallback;
}
