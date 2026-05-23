import { describe, expect, it } from "vitest";

import {
  buildOpenMeteoForecastUrl,
  formatMetric,
  normalizeOpenMeteoResponse,
} from "@/lib/weather";

describe("Open-Meteo weather helpers", () => {
  it("builds a Presidio forecast URL with irrigation-relevant variables", () => {
    const url = new URL(buildOpenMeteoForecastUrl());

    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("current")).toContain("wind_speed_10m");
    expect(url.searchParams.get("hourly")).toContain(
      "et0_fao_evapotranspiration",
    );
    expect(url.searchParams.get("hourly")).toContain(
      "soil_moisture_0_to_1cm",
    );
  });

  it("normalizes current weather and nearest hourly irrigation context", () => {
    const snapshot = normalizeOpenMeteoResponse(
      {
        current: {
          time: "2026-05-23T14:00",
          temperature_2m: 61.4,
          relative_humidity_2m: 72,
          precipitation: 0.01,
          wind_speed_10m: 8.2,
        },
        current_units: {
          temperature_2m: "F",
          relative_humidity_2m: "%",
          precipitation: "inch",
          wind_speed_10m: "mph",
        },
        hourly: {
          time: ["2026-05-23T13:00", "2026-05-23T14:00"],
          precipitation_probability: [20, 35],
          et0_fao_evapotranspiration: [0.0, 0.01],
          soil_moisture_0_to_1cm: [0.24, 0.26],
        },
        hourly_units: {
          precipitation_probability: "%",
          et0_fao_evapotranspiration: "inch",
          soil_moisture_0_to_1cm: "m3/m3",
        },
      },
      "2026-05-23T21:00:00.000Z",
    );

    expect(snapshot.status).toBe("available");
    expect(snapshot.temperature?.value).toBe(61.4);
    expect(snapshot.precipitationProbability?.value).toBe(35);
    expect(snapshot.evapotranspiration?.value).toBe(0.01);
    expect(snapshot.soilMoisture?.value).toBe(0.26);
  });

  it("returns degraded weather when the response shape is unexpected", () => {
    const snapshot = normalizeOpenMeteoResponse({ current: null });

    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.reason).toContain("expected weather shape");
  });

  it("formats compact metric labels", () => {
    expect(formatMetric({ value: 61.4, unit: "F" })).toBe("61 F");
    expect(formatMetric({ value: 84, unit: "%" })).toBe("84%");
    expect(formatMetric({ value: 13.3, unit: "mp/h" })).toBe("13 mph");
    expect(formatMetric({ value: 0.014, unit: "inch" }, 2)).toBe(
      "0.01 inch",
    );
  });
});
