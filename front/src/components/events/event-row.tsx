import Link from "next/link";

import type { EventListItem } from "@/types/api";

const PARIS = "Europe/Paris";

function isValidDate(value: string | null | undefined): boolean {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

function dayNumber(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: PARIS }).format(
    new Date(value),
  );
}

function monthShort(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: PARIS })
    .format(new Date(value))
    .replace(".", "");
}

function timeShort(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS,
  }).format(new Date(value));
}

/**
 * Ligne dense d evenement (mobile-first) : pastille date a gauche, titre +
 * heure/lieu/commune au centre, chip categorie a droite. L image n est pas
 * affichee dans la liste (la date est le signal principal) ; elle reste sur
 * la fiche detail. Objectif : 4 a 6 items visibles par ecran mobile.
 */
export function EventRow({ event }: { event: EventListItem }) {
  const occ = event.next_occurrence;
  const hasDate = isValidDate(occ?.starts_at);
  const venue = [event.venue_name, event.commune_name].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/agenda/${event.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#1a4d6e] hover:shadow-sm"
    >
      <span className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-[#1a4d6e] text-white" style={{ height: 52, width: 52 }}>
        {occ && hasDate ? (
          <>
            <span className="text-lg font-bold leading-none">{dayNumber(occ.starts_at)}</span>
            <span className="mt-0.5 text-[10px] uppercase leading-none opacity-85">
              {monthShort(occ.starts_at)}
            </span>
          </>
        ) : (
          <span className="text-[10px] uppercase leading-none opacity-85">à venir</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#1a4d6e] sm:whitespace-normal">
          {event.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-600">
          {occ && hasDate ? `${timeShort(occ.starts_at)} · ` : ""}
          {venue || event.commune_name}
        </span>
      </span>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
        style={{ backgroundColor: event.category.color }}
      >
        {event.kind === "market" ? "Marché" : event.category.name}
      </span>
    </Link>
  );
}
