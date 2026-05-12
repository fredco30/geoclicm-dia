import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloudSun } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { formatTimeShort, formatTimestampParis } from "@/lib/weather";
import { AdSlot } from "@/components/ads/ad-slot";
import { CommuneSelector } from "@/components/weather/commune-selector";
import { WeatherNow } from "@/components/weather/weather-now";
import { WeatherHourly } from "@/components/weather/weather-hourly";
import { WeatherDaily } from "@/components/weather/weather-daily";
import { WeatherMarinePanel } from "@/components/weather/weather-marine";

// Cache Next 60s (le proxy Django garde 15 min en Redis donc backend OK).
// Plus court qu'avant (était 600s) pour réduire le décalage perçu quand
// l'utilisateur clique sur l'onglet météo. La fraîcheur exacte est aussi
// affichée dans le header (timestamp "Mis à jour à HH:MM").
export const revalidate = 60;

type Props = {
  params: Promise<{ commune: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { commune: slug } = await params;
  try {
    const c = await api.commune(slug);
    const suffix = c.is_coastal ? "Météo et état de la mer" : "Météo locale";
    return {
      title: `${suffix} — ${c.name}`,
      description: c.is_coastal
        ? `Prévisions météo et marine (vagues, houle, température de l'eau) pour ${c.name}, mises à jour toutes les 15 minutes.`
        : `Prévisions météo locales pour ${c.name}, mises à jour toutes les 15 minutes.`,
    };
  } catch {
    return { title: "Météo — commune introuvable" };
  }
}

export default async function MeteoCommunePage({ params }: Props) {
  const { commune: slug } = await params;

  let commune, communes, weather;
  try {
    [commune, communes, weather] = await Promise.all([
      api.commune(slug),
      api.communes(),
      api.weather(slug),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const sortedCommunes = [...communes].sort((a, b) => a.sort_order - b.sort_order);
  const today = weather.forecast.daily[0];

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              <CloudSun
                className="mr-2 inline-block h-8 w-8 align-text-bottom text-[#1a4d6e] sm:h-10 sm:w-10"
                aria-hidden
              />
              Météo · {commune.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Prévisions Open-Meteo · Mis à jour à{" "}
              <time
                dateTime={weather.fetched_at}
                title="Heure de Paris · Données rafraîchies toutes les 15 min"
                className="font-medium text-slate-700"
              >
                {formatTimestampParis(weather.fetched_at)}
              </time>
              {today?.sunrise && today?.sunset ? (
                <>
                  {" · Lever "}
                  {formatTimeShort(today.sunrise)} · Coucher{" "}
                  {formatTimeShort(today.sunset)}
                </>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6">
        <CommuneSelector communes={sortedCommunes} activeSlug={commune.slug} />
      </div>

      {/* Bandeau publicitaire en haut (au-dessus du bloc Maintenant). */}
      <div className="mb-6">
        <AdSlot placement="weather_top" communeSlug={commune.slug} />
      </div>

      <div className="lg:grid lg:grid-cols-[2fr_1fr] lg:items-start lg:gap-6">
        <div className="space-y-6">
          <WeatherNow current={weather.forecast.current} />

          {weather.marine ? (
            <WeatherMarinePanel marine={weather.marine} communeName={commune.name} />
          ) : null}

          <WeatherHourly
            hourly={weather.forecast.hourly}
            isDay={weather.forecast.current.is_day}
          />

          <WeatherDaily daily={weather.forecast.daily} />
        </div>

        {/* Sidebar publicitaire — sticky desktop, en bas sur mobile. */}
        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-20">
          <AdSlot placement="weather_sidebar" communeSlug={commune.slug} />
        </aside>
      </div>

      <p className="mt-10 text-xs text-slate-400">
        Source des données : Open-Meteo (sous licence libre). Coordonnées commune (
        {weather.commune.latitude.toFixed(3)}, {weather.commune.longitude.toFixed(3)}).
      </p>
    </div>
  );
}
