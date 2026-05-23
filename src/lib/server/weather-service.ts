import {
  buildOpenMeteoForecastUrl,
  normalizeOpenMeteoResponse,
  type WeatherSnapshot,
} from "@/lib/weather";

const WEATHER_CACHE_MS = 5 * 60_000;
const WEATHER_FAILURE_CACHE_MS = 30_000;

let cachedWeather:
  | {
      expiresAt: number;
      value: WeatherSnapshot;
    }
  | undefined;

function unavailableWeather(reason: string): WeatherSnapshot {
  return {
    status: "unavailable",
    source: "Open-Meteo",
    location: "Presidio Golf Course",
    fetchedAt: new Date().toISOString(),
    reason,
  };
}

function sanitizeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 180);
  }

  return "Unknown error";
}

export async function getOpenMeteoWeather() {
  const now = Date.now();

  if (cachedWeather && cachedWeather.expiresAt > now) {
    return cachedWeather.value;
  }

  let value: WeatherSnapshot;

  try {
    const response = await fetch(buildOpenMeteoForecastUrl(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      value = unavailableWeather(
        `Open-Meteo request failed with HTTP ${response.status}.`,
      );
    } else {
      value = normalizeOpenMeteoResponse(await response.json());
    }
  } catch (error) {
    value = unavailableWeather(
      `Open-Meteo weather unavailable: ${sanitizeError(error)}.`,
    );
  }

  cachedWeather = {
    expiresAt:
      now +
      (value.status === "available"
        ? WEATHER_CACHE_MS
        : WEATHER_FAILURE_CACHE_MS),
    value,
  };

  return value;
}
