export type ReadinessStatus = "green" | "yellow" | "red";

export type ReadinessCheck = {
  status: ReadinessStatus;
  reason: string;
  checkedAt: string;
};

export type ServerReadiness = ReadinessCheck & {
  checks: {
    mapbox: ReadinessCheck;
    gemini: ReadinessCheck;
  };
};

export type MapboxClientHealth = ReadinessCheck;

export type ReadinessSummary = ReadinessCheck & {
  label: "Ready" | "Checking" | "Blocked";
};

export const readinessColors: Record<ReadinessStatus, string> = {
  green: "#22c55e",
  yellow: "#facc15",
  red: "#ef4444",
};

export function createCheckingReadiness(reason: string): ReadinessCheck {
  return {
    status: "yellow",
    reason,
    checkedAt: new Date().toISOString(),
  };
}

export function combineReadiness(
  serverReadiness: ServerReadiness | null,
  mapboxClientHealth: MapboxClientHealth,
): ReadinessSummary {
  if (mapboxClientHealth.status === "red") {
    return {
      ...mapboxClientHealth,
      label: "Blocked",
    };
  }

  if (!serverReadiness) {
    return {
      ...mapboxClientHealth,
      status: "yellow",
      reason: mapboxClientHealth.reason,
      label: "Checking",
    };
  }

  if (serverReadiness.status === "red") {
    return {
      status: "red",
      reason: serverReadiness.reason,
      checkedAt: serverReadiness.checkedAt,
      label: "Blocked",
    };
  }

  if (
    serverReadiness.status === "yellow" ||
    mapboxClientHealth.status === "yellow"
  ) {
    return {
      status: "yellow",
      reason:
        mapboxClientHealth.status === "yellow"
          ? mapboxClientHealth.reason
          : serverReadiness.reason,
      checkedAt: new Date(
        Math.max(
          Date.parse(serverReadiness.checkedAt),
          Date.parse(mapboxClientHealth.checkedAt),
        ),
      ).toISOString(),
      label: "Checking",
    };
  }

  return {
    status: "green",
    reason: "Mapbox loaded and Gemini schema sanity passed.",
    checkedAt: new Date(
      Math.max(
        Date.parse(serverReadiness.checkedAt),
        Date.parse(mapboxClientHealth.checkedAt),
      ),
    ).toISOString(),
    label: "Ready",
  };
}
