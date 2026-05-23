import type { AssetType, IssueSeverity, LngLat } from "@/data/presidio-demo";

export const MAPBOX_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

export const PRESIDIO_INITIAL_VIEW = {
  center: [-122.46477, 37.79263] as LngLat,
  zoom: 15.75,
  pitch: 42,
  bearing: -14,
};

export const assetColors: Record<AssetType, string> = {
  sprinkler: "#19a974",
  pipe: "#38bdf8",
  valve: "#f59e0b",
  controller: "#a78bfa",
};

export const severityColors: Record<IssueSeverity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#facc15",
  low: "#22c55e",
};

export const layerIds = {
  assetPipes: "gdm-asset-pipes",
  selectedPipes: "gdm-selected-pipes",
  assetSprinklers: "gdm-asset-sprinklers",
  assetValves: "gdm-asset-valves",
  assetControllers: "gdm-asset-controllers",
  selectedPoints: "gdm-selected-points",
  issueMarkers: "gdm-issue-markers",
  prioritizedIssueGlow: "gdm-prioritized-issue-glow",
};

export type LayerVisibility = {
  sprinklers: boolean;
  pipes: boolean;
  valves: boolean;
  controllers: boolean;
  issues: boolean;
};

export const defaultLayerVisibility: LayerVisibility = {
  sprinklers: true,
  pipes: true,
  valves: true,
  controllers: true,
  issues: true,
};
