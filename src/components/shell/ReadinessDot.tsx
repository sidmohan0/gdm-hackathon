"use client";

import { useEffect, useMemo, useState } from "react";

import {
  combineReadiness,
  readinessColors,
  type MapboxClientHealth,
  type ServerReadiness,
} from "@/lib/readiness";

type ReadinessDotProps = {
  mapboxHealth: MapboxClientHealth;
};

function endpointUnavailable(): ServerReadiness {
  const checkedAt = new Date().toISOString();

  return {
    status: "red",
    reason: "Readiness endpoint unavailable.",
    checkedAt,
    checks: {
      mapbox: {
        status: "yellow",
        reason: "Mapbox readiness unknown.",
        checkedAt,
      },
      gemini: {
        status: "red",
        reason: "Gemini readiness unknown.",
        checkedAt,
      },
    },
  };
}

export function ReadinessDot({ mapboxHealth }: ReadinessDotProps) {
  const [serverReadiness, setServerReadiness] =
    useState<ServerReadiness | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadReadiness() {
      try {
        const response = await fetch("/api/readiness", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const readiness = (await response.json()) as ServerReadiness;

        if (!isCancelled) {
          setServerReadiness(readiness);
        }
      } catch {
        if (!isCancelled) {
          setServerReadiness(endpointUnavailable());
        }
      }
    }

    loadReadiness();
    const interval = window.setInterval(loadReadiness, 60_000);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const summary = useMemo(
    () => combineReadiness(serverReadiness, mapboxHealth),
    [mapboxHealth, serverReadiness],
  );

  return (
    <span
      className="inline-flex items-center gap-2 border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300"
      title={summary.reason}
      aria-label={`Readiness ${summary.label}: ${summary.reason}`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: readinessColors[summary.status] }}
        aria-hidden
      />
      {summary.label}
    </span>
  );
}
