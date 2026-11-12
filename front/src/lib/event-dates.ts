import type { EventOccurrence } from "@/types/api";

/**
 * Affichage des dates d'Agenda.
 *
 * Beaucoup d'occurrences importées sont des PÉRIODES (expo du 4 avril au
 * 15 janvier, marché « de janvier à décembre ») : n'afficher que le début
 * donnait une date passée pour un rendez-vous en cours. Une heure de début à
 * minuit signifie « heure inconnue » et n'est jamais affichée.
 */

const PARIS = "Europe/Paris";
const DAY_MS = 24 * 60 * 60 * 1000;

type Occ = Pick<EventOccurrence, "starts_at" | "ends_at" | "is_all_day">;

function fmt(options: Intl.DateTimeFormatOptions, value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, ...options }).format(new Date(value));
}

export function isValidDate(value: string | null | undefined): value is string {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

export function timeShort(value: string): string {
  return fmt({ hour: "2-digit", minute: "2-digit" }, value);
}

/** Période de plus de 24 h (et non une soirée qui déborde après minuit). */
export function isMultiDay(occ: Occ): boolean {
  if (!isValidDate(occ.starts_at) || !isValidDate(occ.ends_at)) return false;
  return new Date(occ.ends_at).getTime() - new Date(occ.starts_at).getTime() > DAY_MS;
}

/** Période déjà commencée et pas encore terminée. */
export function isOngoing(occ: Occ, now: Date = new Date()): boolean {
  return (
    isMultiDay(occ) &&
    new Date(occ.starts_at).getTime() <= now.getTime() &&
    new Date(occ.ends_at).getTime() >= now.getTime()
  );
}

/** Heure de début réellement connue (ni journée entière, ni minuit par défaut). */
export function hasClockTime(occ: Occ): boolean {
  return !occ.is_all_day && isValidDate(occ.starts_at) && timeShort(occ.starts_at) !== "00:00";
}

function hours(occ: Occ): string {
  if (!hasClockTime(occ)) return "";
  const start = timeShort(occ.starts_at);
  const end = isValidDate(occ.ends_at) ? timeShort(occ.ends_at) : start;
  return end !== start && end !== "00:00" ? `de ${start} à ${end}` : `à ${start}`;
}

/** « Jusqu'au 31 déc. » (année précisée si elle diffère de l'année en cours). */
export function untilLabel(occ: Occ, now: Date = new Date(), month: "short" | "long" = "short"): string {
  const sameYear = fmt({ year: "numeric" }, occ.ends_at) === fmt({ year: "numeric" }, now.toISOString());
  return `Jusqu'au ${fmt({ day: "numeric", month, ...(sameYear ? {} : { year: "numeric" }) }, occ.ends_at)}`;
}

/** Résumé sur une ligne pour les cartes, la carte interactive et la une. */
export function occurrenceSummary(occ: Occ | null | undefined, now: Date = new Date()): string {
  if (!occ || !isValidDate(occ.starts_at)) return "Date à confirmer";
  const time = hours(occ);
  if (isOngoing(occ, now)) {
    return ["En ce moment", untilLabel(occ, now, "long").toLowerCase(), time].filter(Boolean).join(" · ");
  }
  const start = fmt({ weekday: "short", day: "numeric", month: "long" }, occ.starts_at);
  if (isMultiDay(occ)) {
    const end = fmt({ day: "numeric", month: "long" }, occ.ends_at);
    return [`Du ${start} au ${end}`, time].filter(Boolean).join(" · ");
  }
  return time ? `${start}, ${time}` : start;
}

/** Libellé complet pour la fiche détail. */
export function occurrenceLong(occ: Occ): string {
  const full: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const time = hours(occ);
  if (isMultiDay(occ)) {
    const range = `Du ${fmt({ day: "numeric", month: "long", year: "numeric" }, occ.starts_at)} au ${fmt({ day: "numeric", month: "long", year: "numeric" }, occ.ends_at)}`;
    return time ? `${range}, ${time}` : range;
  }
  const date = fmt(full, occ.starts_at);
  if (time) return `${date}, ${time}`;
  return occ.is_all_day ? `${date} — toute la journée` : date;
}
