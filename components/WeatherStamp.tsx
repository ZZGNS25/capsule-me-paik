import { formatWeatherLine } from "@/lib/weather";

type WeatherStampProps = {
  weather?: string | null;
  weather_temp?: number | null;
  weather_humidity?: number | null;
  className?: string;
};

export default function WeatherStamp({
  weather,
  weather_temp,
  weather_humidity,
  className = "",
}: WeatherStampProps) {
  const line = formatWeatherLine({ weather, weather_temp, weather_humidity });
  if (!line) return null;

  return (
    <p className={`mono-readout text-sm text-sky-200/90 ${className}`}>
      묻은 날 · {line}
    </p>
  );
}
