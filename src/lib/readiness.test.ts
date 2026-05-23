import { describe, expect, it } from "vitest";

import {
  combineReadiness,
  type MapboxClientHealth,
  type ReadinessCheck,
  type ServerReadiness,
} from "@/lib/readiness";

const checkedAt = "2026-05-23T20:00:00.000Z";

function check(status: ReadinessCheck["status"], reason: string): ReadinessCheck {
  return {
    status,
    reason,
    checkedAt,
  };
}

function server(
  status: ServerReadiness["status"],
  reason = "server reason",
): ServerReadiness {
  return {
    status,
    reason,
    checkedAt,
    checks: {
      mapbox: check("green", "mapbox ok"),
      gemini: check(status, reason),
    },
  };
}

describe("readiness summary", () => {
  it("is green only when server and client map health are green", () => {
    const mapbox: MapboxClientHealth = check("green", "map loaded");
    const summary = combineReadiness(server("green"), mapbox);

    expect(summary.status).toBe("green");
    expect(summary.label).toBe("Ready");
  });

  it("treats a client Mapbox failure as a critical blocker", () => {
    const mapbox: MapboxClientHealth = check("red", "map failed");
    const summary = combineReadiness(server("green"), mapbox);

    expect(summary.status).toBe("red");
    expect(summary.label).toBe("Blocked");
    expect(summary.reason).toBe("map failed");
  });

  it("treats Gemini/schema failure as a critical blocker", () => {
    const mapbox: MapboxClientHealth = check("green", "map loaded");
    const summary = combineReadiness(server("red", "gemini failed"), mapbox);

    expect(summary.status).toBe("red");
    expect(summary.label).toBe("Blocked");
    expect(summary.reason).toBe("gemini failed");
  });

  it("stays yellow while either side is still checking", () => {
    const mapbox: MapboxClientHealth = check("yellow", "map loading");
    const summary = combineReadiness(server("green"), mapbox);

    expect(summary.status).toBe("yellow");
    expect(summary.label).toBe("Checking");
  });
});
