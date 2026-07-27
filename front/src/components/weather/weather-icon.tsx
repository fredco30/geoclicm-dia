import { describeWeatherCode, renderWeatherIcon } from "@/lib/weather";

type Props = {
  code: number | null | undefined;
  isDay: boolean;
  className?: string;
  size?: number;
  withLabel?: boolean;
};

/** Icône Lucide correspondant à un code WMO Open-Meteo. */
export function WeatherIcon({
  code,
  isDay,
  className = "h-6 w-6",
  size,
  withLabel = false,
}: Props) {
  const { label, iconKey } = describeWeatherCode(code, isDay);
  const icon = renderWeatherIcon(iconKey, {
    className,
    size,
    "aria-hidden": true,
  });

  return (
    <span
      className={withLabel ? "inline-flex items-center gap-2" : undefined}
      title={label}
      aria-label={label}
    >
      {icon}
      {withLabel ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}
