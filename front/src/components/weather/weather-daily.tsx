import { Droplet, Wind } from "lucide-react";
import type { WeatherDailyEntry } from "@/types/api";
import {
  degreesToCompass,
  formatDayLabel,
  getCurrentParisDateTime,
} from "@/lib/weather";
import { WeatherIcon } from "./weather-icon";

type Props = {
  daily: WeatherDailyEntry[];
};

export function WeatherDaily({ daily }: Props) {
  if (daily.length === 0) return null;

  // Date Paris (pas UTC du serveur), pour repérer correctement "Aujourd'hui"
  // entre 22h Paris et minuit (où UTC est sur la veille).
  const today = getCurrentParisDateTime().date;

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold text-slate-900">
        Prévisions 7 jours
      </h2>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {daily.map((d) => {
          const isToday = d.date === today;
          return (
            <li
              key={d.date}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1.4fr_auto_1fr_auto_auto]`}
            >
              <span
                className={`text-sm capitalize ${
                  isToday ? "font-semibold text-[#1a4d6e]" : "text-slate-800"
                }`}
              >
                {formatDayLabel(d.date, isToday)}
              </span>

              <WeatherIcon
                code={d.weather_code}
                isDay={true}
                className="h-6 w-6 text-slate-700"
              />

              <span className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">
                {d.precipitation_probability_max !== null &&
                d.precipitation_probability_max >= 10 ? (
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <Droplet className="h-3.5 w-3.5" />
                    {d.precipitation_probability_max}%
                  </span>
                ) : null}
                {d.wind_speed_max !== null ? (
                  <span className="inline-flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5" />
                    {Math.round(d.wind_speed_max)} km/h{" "}
                    {degreesToCompass(d.wind_direction_dominant)}
                  </span>
                ) : null}
              </span>

              <span className="text-sm text-slate-500">
                {d.temperature_min !== null ? `${Math.round(d.temperature_min)}°` : "—"}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {d.temperature_max !== null ? `${Math.round(d.temperature_max)}°` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
