import { Droplet, Sun as SunIcon, Wind } from "lucide-react";
import type { WeatherCurrent } from "@/types/api";
import { degreesToCompass, describeUv, describeWeatherCode } from "@/lib/weather";
import { WeatherIcon } from "./weather-icon";

type Props = {
  current: WeatherCurrent;
};

export function WeatherNow({ current }: Props) {
  const { label } = describeWeatherCode(current.weather_code, current.is_day);

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#1a4d6e] to-[#13384f] p-6 text-white shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <WeatherIcon
            code={current.weather_code}
            isDay={current.is_day}
            className="h-16 w-16 text-white/90 sm:h-20 sm:w-20"
          />
          <div>
            <div className="font-serif text-5xl font-semibold leading-none sm:text-6xl">
              {current.temperature !== null ? `${Math.round(current.temperature)}°` : "—"}
            </div>
            <div className="mt-2 text-sm text-white/80">
              Ressentie{" "}
              {current.apparent_temperature !== null
                ? `${Math.round(current.apparent_temperature)}°`
                : "—"}
            </div>
          </div>
        </div>

        <div className="text-base font-medium text-white/90 sm:text-right">
          {label}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-4">
        <DetailItem
          icon={<Wind className="h-4 w-4" />}
          label="Vent"
          value={
            current.wind_speed !== null
              ? `${Math.round(current.wind_speed)} km/h ${degreesToCompass(current.wind_direction)}`
              : "—"
          }
          sub={
            current.wind_gusts !== null
              ? `Rafales ${Math.round(current.wind_gusts)} km/h`
              : undefined
          }
        />
        <DetailItem
          icon={<Droplet className="h-4 w-4" />}
          label="Humidité"
          value={current.humidity !== null ? `${Math.round(current.humidity)} %` : "—"}
        />
        <DetailItem
          icon={<SunIcon className="h-4 w-4" />}
          label="UV"
          value={describeUv(current.uv_index)}
        />
        <DetailItem
          icon={<Droplet className="h-4 w-4" />}
          label="Précipitations"
          value={
            current.precipitation !== null
              ? `${current.precipitation.toFixed(1)} mm`
              : "—"
          }
        />
      </div>
    </section>
  );
}

function DetailItem({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-medium text-white">{value}</div>
      {sub ? <div className="text-xs text-white/60">{sub}</div> : null}
    </div>
  );
}
