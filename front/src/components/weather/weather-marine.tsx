import { Anchor, Thermometer, Waves } from "lucide-react";
import type { SwimmingIndicator, WeatherMarine } from "@/types/api";
import { degreesToCompass } from "@/lib/weather";

type Props = {
  marine: WeatherMarine;
  communeName: string;
};

const SWIM_LABEL: Record<SwimmingIndicator, string> = {
  green: "Conditions favorables",
  orange: "Vigilance — conditions changeantes",
  red: "Conditions difficiles",
};

const SWIM_BG: Record<SwimmingIndicator, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-red-500",
};

const SWIM_TEXT: Record<SwimmingIndicator, string> = {
  green: "text-emerald-700",
  orange: "text-amber-700",
  red: "text-red-700",
};

export function WeatherMarinePanel({ marine, communeName }: Props) {
  const sst = marine.sea_surface_temperature;
  const wave = marine.current.wave_height;
  const period = marine.current.wave_period;
  const swell = marine.current.swell_wave_height;
  const swellPeriod = marine.current.swell_wave_period;
  const indicator = marine.swimming_indicator;

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-6">
      <header className="mb-4 flex items-center gap-2">
        <Waves className="h-5 w-5 text-[#1a4d6e]" aria-hidden />
        <h2 className="font-serif text-xl font-semibold text-slate-900">
          État de la mer · {communeName}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          icon={<Thermometer className="h-4 w-4" />}
          label="Température eau"
          value={sst !== null ? `${sst.toFixed(1)} °C` : "—"}
        />
        <Stat
          icon={<Waves className="h-4 w-4" />}
          label="Hauteur des vagues"
          value={wave !== null ? `${wave.toFixed(1)} m` : "—"}
          sub={period !== null ? `Période ${period.toFixed(1)} s` : undefined}
        />
        <Stat
          icon={<Anchor className="h-4 w-4" />}
          label="Houle"
          value={swell !== null ? `${swell.toFixed(1)} m` : "—"}
          sub={
            swellPeriod !== null
              ? `Période ${swellPeriod.toFixed(1)} s · ${degreesToCompass(
                  marine.current.wave_direction,
                )}`
              : undefined
          }
        />
        <Stat
          icon={<Waves className="h-4 w-4" />}
          label="Vagues max 24 h"
          value={
            marine.daily[0]?.wave_height_max !== null &&
            marine.daily[0]?.wave_height_max !== undefined
              ? `${marine.daily[0].wave_height_max.toFixed(1)} m`
              : "—"
          }
        />
      </div>

      {indicator ? (
        <div className="mt-5 rounded-xl border border-white/60 bg-white/70 p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={`h-3 w-3 rounded-full ring-2 ring-white ${SWIM_BG[indicator]}`}
            />
            <span className={`text-sm font-semibold ${SWIM_TEXT[indicator]}`}>
              Baignade — {SWIM_LABEL[indicator]}
            </span>
          </div>
          <p className="mt-2 text-xs italic text-slate-600">
            {marine.swimming_disclaimer}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-xs italic text-slate-500">
          Indicateur baignade indisponible (données partielles).
        </p>
      )}
    </section>
  );
}

function Stat({
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
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}
