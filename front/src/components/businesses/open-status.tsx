"use client";

import { getOpeningStatus, type OpeningHours, type SeasonalClosure } from "@/lib/opening-status";
import { useMounted } from "@/lib/use-mounted";

type Props = { hours: OpeningHours; closures: SeasonalClosure[] };

/**
 * Pastille « Ouvert · ferme à 19:00 » / « Fermé · ouvre à 14:00 ».
 * Calculée dans le navigateur : la page vient d'un cache, l'heure non.
 */
export function OpenStatus({ hours, closures }: Props) {
  const mounted = useMounted();
  if (!mounted) return null;
  const status = getOpeningStatus(hours, closures);
  if (!status) return null;

  return (
    <p className="mt-3 inline-flex items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
          status.isOpen ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${status.isOpen ? "bg-green-600" : "bg-slate-500"}`}
          aria-hidden
        />
        {status.isOpen ? "Ouvert" : "Fermé"}
      </span>
      <span className="text-slate-600">{status.detail}</span>
    </p>
  );
}
