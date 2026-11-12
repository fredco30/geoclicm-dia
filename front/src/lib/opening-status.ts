/**
 * « Ouvert maintenant » d'une fiche commerce, calculé à l'heure de Paris.
 *
 * Fonction pure (testable) : le composant <OpenStatus /> l'appelle côté
 * navigateur, car la fiche est servie depuis un cache de plusieurs minutes.
 */

type Slot = { open: string; close: string };
export type OpeningHours = Record<string, Slot[]>;
export type SeasonalClosure = { from: string; to: string; reason: string };

export type OpeningStatus = {
  isOpen: boolean;
  /** « ferme à 19:00 », « ouvre à 14:00 », « ouvre demain à 09:00 »… */
  detail: string;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function minutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Jour (0 = lundi), minutes depuis minuit et date ISO, à Paris. */
function parisNow(now: Date): { day: number; time: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return {
    day: Math.max(day, 0),
    time: Number(get("hour")) * 60 + Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function formatClosureDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function getOpeningStatus(
  hours: OpeningHours,
  closures: SeasonalClosure[] = [],
  now: Date = new Date(),
): OpeningStatus | null {
  const slotsOf = (day: number) =>
    [...(hours[DAYS[day]] ?? [])].sort((a, b) => minutes(a.open) - minutes(b.open));
  if (!DAYS.some((_, day) => slotsOf(day).length > 0)) return null;

  const { day, time, date } = parisNow(now);

  const closure = closures.find((item) => item.from <= date && date <= item.to);
  if (closure) {
    return { isOpen: false, detail: `fermeture jusqu'au ${formatClosureDate(closure.to)}` };
  }

  // Créneau de la veille qui déborde après minuit (bar ouvert de 18:00 à 02:00).
  const late = slotsOf((day + 6) % 7).find(
    (slot) => minutes(slot.close) < minutes(slot.open) && time < minutes(slot.close),
  );
  if (late) return { isOpen: true, detail: `ferme à ${late.close}` };

  for (const slot of slotsOf(day)) {
    const open = minutes(slot.open);
    const close = minutes(slot.close);
    const overnight = close <= open;
    if (time >= open && (overnight || time < close)) {
      return { isOpen: true, detail: `ferme à ${slot.close}` };
    }
    if (time < open) return { isOpen: false, detail: `ouvre à ${slot.open}` };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const next = (day + offset) % 7;
    const first = slotsOf(next)[0];
    if (first) {
      const when = offset === 1 ? "demain" : DAYS_FR[next];
      return { isOpen: false, detail: `ouvre ${when} à ${first.open}` };
    }
  }
  return null;
}
