import type { WeatherHourlyEntry } from "@/types/api";
import {
  extractParisHour,
  formatHourLabel,
  isFutureParisTimestamp,
} from "@/lib/weather";
import { WeatherIcon } from "./weather-icon";

type Props = {
  hourly: WeatherHourlyEntry[];
  /** Heure actuelle utilisée pour ne montrer que les heures à venir. */
  isDay: boolean;
};

export function WeatherHourly({ hourly, isDay }: Props) {
  // Filtre par comparaison string/int avec l'heure courante Paris pour
  // rester immune à la TZ du serveur SSR (VPS en UTC). Garde 30 min de
  // marge passée pour conserver l'heure "Maintenant".
  const upcoming = hourly
    .filter((h) => isFutureParisTimestamp(h.time, 30))
    .slice(0, 24);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold text-slate-900">
        Prochaines 24 heures
      </h2>
      <div className="overflow-x-auto">
        <ul
          className="flex gap-3 pb-3"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {upcoming.map((h, idx) => {
            const isCurrent = idx === 0;
            const isHourDay = isHourDaytime(h.time, isDay);
            return (
              <li
                key={h.time}
                style={{ scrollSnapAlign: "start" }}
                className={`flex min-w-[68px] flex-col items-center rounded-xl border px-3 py-2 text-center text-sm ${
                  isCurrent
                    ? "border-[#1a4d6e] bg-[#1a4d6e]/5 font-semibold text-[#1a4d6e]"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="text-xs">
                  {isCurrent ? "Maintenant" : formatHourLabel(h.time)}
                </span>
                <WeatherIcon
                  code={h.weather_code}
                  isDay={isHourDay}
                  className="my-1 h-6 w-6"
                />
                <span className="text-base">
                  {h.temperature !== null ? `${Math.round(h.temperature)}°` : "—"}
                </span>
                {h.precipitation_probability !== null &&
                h.precipitation_probability >= 10 ? (
                  <span className="mt-0.5 text-[11px] text-blue-600">
                    {h.precipitation_probability}%
                  </span>
                ) : (
                  <span className="mt-0.5 text-[11px] text-transparent">.</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Heuristique : entre 7 h et 21 h c'est le jour, sinon nuit.
 *  is_day du current ne couvre que l'instant T, pas les 24 h suivantes.
 *  Extract heure directement du string (TZ-safe vs new Date().getHours()). */
function isHourDaytime(iso: string, _currentIsDay: boolean): boolean {
  const h = extractParisHour(iso);
  if (h === null) return true;
  return h >= 7 && h <= 20;
}
