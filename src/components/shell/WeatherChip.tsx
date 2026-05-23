"use client";

import { CloudSun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatMetric, type WeatherSnapshot } from "@/lib/weather";

function unavailableWeather(reason: string): WeatherSnapshot {
  return {
    status: "unavailable",
    source: "Open-Meteo",
    location: "Presidio Golf Course",
    fetchedAt: new Date().toISOString(),
    reason,
  };
}

export function WeatherChip() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadWeather() {
      try {
        const response = await fetch("/api/weather", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const snapshot = (await response.json()) as WeatherSnapshot;

        if (!isCancelled) {
          setWeather(snapshot);
        }
      } catch {
        if (!isCancelled) {
          setWeather(unavailableWeather("Open-Meteo weather unavailable."));
        }
      }
    }

    loadWeather();

    return () => {
      isCancelled = true;
    };
  }, []);

  const label = useMemo(() => {
    if (!weather) {
      return "Weather checking";
    }

    if (weather.status === "unavailable") {
      return "Weather unavailable";
    }

    const temperature = formatMetric(weather.temperature);
    const humidity = formatMetric(weather.humidity);
    const wind = formatMetric(weather.windSpeed);
    const rain = formatMetric(weather.precipitationProbability);
    const et0 = formatMetric(weather.evapotranspiration, 2);

    return [
      temperature,
      humidity ? `RH ${humidity}` : null,
      wind ? `Wind ${wind}` : null,
      rain ? `Rain ${rain}` : null,
      et0 ? `ET0 ${et0}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [weather]);

  const title = useMemo(() => {
    if (!weather) {
      return "Fetching Open-Meteo weather for Presidio Golf Course.";
    }

    if (weather.status === "unavailable") {
      return weather.reason ?? "Open-Meteo weather unavailable.";
    }

    const soilMoisture = formatMetric(weather.soilMoisture, 2);
    const precipitation = formatMetric(weather.precipitation, 2);

    return [
      `Source: ${weather.source}`,
      weather.observedAt ? `Observed: ${weather.observedAt}` : null,
      precipitation ? `Precipitation: ${precipitation}` : null,
      soilMoisture ? `Soil moisture: ${soilMoisture}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [weather]);

  return (
    <span
      className="inline-flex max-w-full items-center gap-2 border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300"
      title={title}
      aria-label={`Weather: ${label}`}
    >
      <CloudSun className="h-4 w-4 text-amber-300" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
