import { z } from "zod";

import { PRESIDIO_COURSE } from "@/data/presidio-demo";

const nullableNumber = z.number().nullable().optional();

const openMeteoSchema = z
  .object({
    current: z
      .object({
        time: z.string(),
        temperature_2m: nullableNumber,
        relative_humidity_2m: nullableNumber,
        precipitation: nullableNumber,
        wind_speed_10m: nullableNumber,
      })
      .passthrough(),
    current_units: z.record(z.string(), z.string()).optional(),
    hourly: z
      .object({
        time: z.array(z.string()),
        precipitation_probability: z.array(nullableNumber).optional(),
        et0_fao_evapotranspiration: z.array(nullableNumber).optional(),
        soil_moisture_0_to_1cm: z.array(nullableNumber).optional(),
      })
      .passthrough(),
    hourly_units: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export type WeatherStatus = "available" | "unavailable";

export type WeatherSnapshot = {
  status: WeatherStatus;
  source: "Open-Meteo";
  location: string;
  fetchedAt: string;
  observedAt?: string;
  reason?: string;
  temperature?: {
    value: number;
    unit: string;
  };
  windSpeed?: {
    value: number;
    unit: string;
  };
  humidity?: {
    value: number;
    unit: string;
  };
  precipitation?: {
    value: number;
    unit: string;
  };
  precipitationProbability?: {
    value: number;
    unit: string;
  };
  evapotranspiration?: {
    value: number;
    unit: string;
  };
  soilMoisture?: {
    value: number;
    unit: string;
  };
};

export function buildOpenMeteoForecastUrl() {
  const [longitude, latitude] = PRESIDIO_COURSE.center;
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    hourly:
      "precipitation_probability,et0_fao_evapotranspiration,soil_moisture_0_to_1cm",
    forecast_hours: "6",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "America/Los_Angeles",
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function firstPresentIndex(values: Array<number | null | undefined>) {
  return values.findIndex((value) => typeof value === "number");
}

function nearestHourlyIndex(times: string[], observedAt: string) {
  const exactMatch = times.indexOf(observedAt);

  if (exactMatch >= 0) {
    return exactMatch;
  }

  const observedMs = Date.parse(observedAt);

  if (Number.isNaN(observedMs)) {
    return 0;
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const distance = Math.abs(Date.parse(time) - observedMs);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function numberMetric(value: number | null | undefined, unit = "") {
  return typeof value === "number" ? { value, unit } : undefined;
}

export function normalizeOpenMeteoResponse(
  payload: unknown,
  fetchedAt = new Date().toISOString(),
): WeatherSnapshot {
  const parsed = openMeteoSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "unavailable",
      source: "Open-Meteo",
      location: PRESIDIO_COURSE.name,
      fetchedAt,
      reason: "Open-Meteo response did not match the expected weather shape.",
    };
  }

  const { current, current_units, hourly, hourly_units } = parsed.data;
  const hourlyIndex = nearestHourlyIndex(hourly.time, current.time);
  const firstProbabilityIndex = firstPresentIndex(
    hourly.precipitation_probability ?? [],
  );
  const probabilityIndex =
    hourly.precipitation_probability?.[hourlyIndex] == null
      ? firstProbabilityIndex
      : hourlyIndex;

  return {
    status: "available",
    source: "Open-Meteo",
    location: PRESIDIO_COURSE.name,
    fetchedAt,
    observedAt: current.time,
    temperature: numberMetric(
      current.temperature_2m,
      current_units?.temperature_2m,
    ),
    windSpeed: numberMetric(
      current.wind_speed_10m,
      current_units?.wind_speed_10m,
    ),
    humidity: numberMetric(
      current.relative_humidity_2m,
      current_units?.relative_humidity_2m,
    ),
    precipitation: numberMetric(
      current.precipitation,
      current_units?.precipitation,
    ),
    precipitationProbability:
      probabilityIndex >= 0
        ? numberMetric(
            hourly.precipitation_probability?.[probabilityIndex],
            hourly_units?.precipitation_probability,
          )
        : undefined,
    evapotranspiration: numberMetric(
      hourly.et0_fao_evapotranspiration?.[hourlyIndex],
      hourly_units?.et0_fao_evapotranspiration,
    ),
    soilMoisture: numberMetric(
      hourly.soil_moisture_0_to_1cm?.[hourlyIndex],
      hourly_units?.soil_moisture_0_to_1cm,
    ),
  };
}

export function formatMetric(
  metric: { value: number; unit: string } | undefined,
  maximumFractionDigits = 0,
) {
  if (!metric) {
    return null;
  }

  const normalizedUnit =
    metric.unit === "mp/h"
      ? "mph"
      : metric.unit === "\u00b0F"
        ? "F"
        : metric.unit;
  const separator = normalizedUnit === "%" ? "" : " ";

  return `${metric.value.toLocaleString("en-US", {
    maximumFractionDigits,
  })}${normalizedUnit ? `${separator}${normalizedUnit}` : ""}`;
}
