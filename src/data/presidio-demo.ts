export type LngLat = [number, number];

export type AssetType = "sprinkler" | "pipe" | "valve" | "controller";

export type AssetStatus = "healthy" | "watch" | "service";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type IssueStatus = "open" | "scheduled" | "monitoring" | "resolved";

export type AssetGeometry =
  | {
      type: "Point";
      coordinates: LngLat;
    }
  | {
      type: "LineString";
      coordinates: LngLat[];
    };

export type DemoAsset = {
  id: string;
  fieldId: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  zone: string;
  hole: string;
  coordinates: LngLat;
  geometry: AssetGeometry;
  installYear: number;
  controllerId: string;
  metrics: {
    pressurePsi?: number;
    flowGpm?: number;
    moisturePct?: number;
    voltage?: number;
  };
  notes: string;
};

export type DemoIssue = {
  id: string;
  assetId: string;
  fieldId?: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  coordinates: LngLat;
  openedAt: string;
  priorityScore: number;
  summary: string;
  recommendedAction: string;
  source?: "seed" | "generated";
  observationId?: string;
  workOrderId?: string;
  confidence?: number;
  evidence?: string[];
};

export type DemoFeature = {
  type: "Feature";
  id: string;
  geometry: AssetGeometry | { type: "Point"; coordinates: LngLat };
  properties: Record<string, string | number | undefined>;
};

export type DemoFeatureCollection = {
  type: "FeatureCollection";
  features: DemoFeature[];
};

export const DEMO_PHOTO_PATH = "/demo-image.png";

export const PRESIDIO_COURSE = {
  name: "Presidio Golf Course",
  city: "San Francisco, CA",
  center: [-122.46477, 37.79263] as LngLat,
  bounds: {
    west: -122.4725,
    south: 37.7874,
    east: -122.4559,
    north: 37.7983,
  },
};

export const presidioAssets: DemoAsset[] = [
  {
    id: "PGC-CTRL-A",
    fieldId: "controller-a",
    name: "North Loop Controller A",
    type: "controller",
    status: "healthy",
    zone: "North irrigation loop",
    hole: "Practice / 1",
    coordinates: [-122.4662, 37.79352],
    geometry: {
      type: "Point",
      coordinates: [-122.4662, 37.79352],
    },
    installYear: 2021,
    controllerId: "PGC-CTRL-A",
    metrics: {
      voltage: 24.3,
    },
    notes: "Decoder cabinet serving the north loop and practice green.",
  },
  {
    id: "PGC-VLV-07",
    fieldId: "valve-3g",
    name: "Hole 3 Green Valve Box",
    type: "valve",
    status: "watch",
    zone: "North irrigation loop",
    hole: "3",
    coordinates: [-122.46365, 37.79255],
    geometry: {
      type: "Point",
      coordinates: [-122.46365, 37.79255],
    },
    installYear: 2017,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 71,
      flowGpm: 18,
    },
    notes: "Valve box sits low after spring mowing; inspect after rain.",
  },
  {
    id: "PGC-SH-014",
    fieldId: "head-1f1",
    name: "Hole 2 Green Rotor 014",
    type: "sprinkler",
    status: "service",
    zone: "North irrigation loop",
    hole: "2",
    coordinates: [-122.46512, 37.79222],
    geometry: {
      type: "Point",
      coordinates: [-122.46512, 37.79222],
    },
    installYear: 2019,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 64,
      flowGpm: 11,
      moisturePct: 31,
    },
    notes: "Rotor sits along the collar and is visible from the cart path.",
  },
  {
    id: "PGC-SH-027",
    fieldId: "head-4f2",
    name: "Hole 4 Fairway Head 027",
    type: "sprinkler",
    status: "healthy",
    zone: "West fairway loop",
    hole: "4",
    coordinates: [-122.46738, 37.79142],
    geometry: {
      type: "Point",
      coordinates: [-122.46738, 37.79142],
    },
    installYear: 2020,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 69,
      flowGpm: 13,
      moisturePct: 28,
    },
    notes: "High-traffic fairway head near the left landing area.",
  },
  {
    id: "PGC-SH-033",
    fieldId: "head-5r1",
    name: "Hole 5 Rough Head 033",
    type: "sprinkler",
    status: "watch",
    zone: "West fairway loop",
    hole: "5",
    coordinates: [-122.46837, 37.79308],
    geometry: {
      type: "Point",
      coordinates: [-122.46837, 37.79308],
    },
    installYear: 2018,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 67,
      flowGpm: 9,
      moisturePct: 24,
    },
    notes: "Nozzle arc should avoid the native rough edge.",
  },
  {
    id: "PGC-SH-041",
    fieldId: "head-7t1",
    name: "Hole 7 Tee Rotor 041",
    type: "sprinkler",
    status: "healthy",
    zone: "East tee loop",
    hole: "7",
    coordinates: [-122.46191, 37.79442],
    geometry: {
      type: "Point",
      coordinates: [-122.46191, 37.79442],
    },
    installYear: 2022,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 73,
      flowGpm: 10,
      moisturePct: 29,
    },
    notes: "Recently leveled after tee renovation work.",
  },
  {
    id: "PGC-LP-03",
    fieldId: "pipe-2g-lateral",
    name: "Hole 2 Green Lateral Pipe",
    type: "pipe",
    status: "service",
    zone: "North irrigation loop",
    hole: "2",
    coordinates: [-122.46461, 37.79219],
    geometry: {
      type: "LineString",
      coordinates: [
        [-122.46521, 37.79207],
        [-122.46491, 37.79214],
        [-122.46458, 37.7922],
        [-122.46417, 37.79232],
      ],
    },
    installYear: 2016,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 62,
      flowGpm: 22,
    },
    notes: "Two-inch lateral feeding the No. 2 green rotor cluster.",
  },
  {
    id: "PGC-LP-05",
    fieldId: "pipe-4f-lateral",
    name: "Hole 4 Fairway Lateral Pipe",
    type: "pipe",
    status: "healthy",
    zone: "West fairway loop",
    hole: "4",
    coordinates: [-122.46755, 37.79162],
    geometry: {
      type: "LineString",
      coordinates: [
        [-122.4681, 37.7913],
        [-122.46774, 37.79147],
        [-122.46731, 37.7917],
        [-122.46692, 37.79191],
      ],
    },
    installYear: 2018,
    controllerId: "PGC-CTRL-A",
    metrics: {
      pressurePsi: 70,
      flowGpm: 19,
    },
    notes: "Stable lateral under routine observation during dry spells.",
  },
];

export const seedIssues: DemoIssue[] = [
  {
    id: "PGC-ISS-101",
    assetId: "PGC-SH-014",
    title: "Rotor head stuck high beside No. 2 green",
    severity: "high",
    status: "open",
    coordinates: [-122.46508, 37.79223],
    openedAt: "2026-05-19T15:12:00.000Z",
    priorityScore: 82,
    summary:
      "Head appears proud of grade and could catch a mower or redirect irrigation into the collar.",
    recommendedAction:
      "Flag the head, lower assembly, inspect riser threads, and verify arc after the evening cycle.",
  },
  {
    id: "PGC-ISS-102",
    assetId: "PGC-LP-03",
    title: "Soft wet spot over lateral pipe",
    severity: "critical",
    status: "scheduled",
    coordinates: [-122.46452, 37.79221],
    openedAt: "2026-05-20T13:40:00.000Z",
    priorityScore: 94,
    summary:
      "Localized wet turf near the cart path edge suggests a slow lateral leak.",
    recommendedAction:
      "Close the zone, pressure test the lateral, and stage a two-person repair window before morning play.",
  },
  {
    id: "PGC-ISS-103",
    assetId: "PGC-VLV-07",
    title: "Valve box cover sunk below collar",
    severity: "medium",
    status: "open",
    coordinates: [-122.46366, 37.79256],
    openedAt: "2026-05-21T18:05:00.000Z",
    priorityScore: 57,
    summary:
      "Box cover is recessed and likely to collect water after the next storm cell.",
    recommendedAction:
      "Raise the box ring, pack base material, and confirm the lid sits flush with the mowing line.",
  },
  {
    id: "PGC-ISS-104",
    assetId: "PGC-SH-033",
    title: "Nozzle arc drifting into native rough",
    severity: "low",
    status: "monitoring",
    coordinates: [-122.46838, 37.79308],
    openedAt: "2026-05-22T11:22:00.000Z",
    priorityScore: 31,
    summary:
      "Minor overspray is visible after the late cycle but is not affecting play.",
    recommendedAction:
      "Adjust nozzle arc during the next routine west-loop inspection.",
  },
];

export const severityRank: Record<IssueSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function getAssetById(assetId: string) {
  return presidioAssets.find((asset) => asset.id === assetId);
}

export function getIssueById(issueId: string, issues = seedIssues) {
  return issues.find((issue) => issue.id === issueId);
}

export function getIssuesForAsset(assetId: string, issues = seedIssues) {
  return issues.filter(
    (issue) => issue.assetId === assetId && issue.status !== "resolved",
  );
}

export function isCoordinateInsidePresidio([lng, lat]: LngLat) {
  return (
    lng >= PRESIDIO_COURSE.bounds.west &&
    lng <= PRESIDIO_COURSE.bounds.east &&
    lat >= PRESIDIO_COURSE.bounds.south &&
    lat <= PRESIDIO_COURSE.bounds.north
  );
}

export function buildAssetFeatureCollection(
  assets = presidioAssets,
): DemoFeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature",
      id: asset.id,
      geometry: asset.geometry,
      properties: {
        assetId: asset.id,
        fieldId: asset.fieldId,
        assetType: asset.type,
        name: asset.name,
        zone: asset.zone,
        hole: asset.hole,
        status: asset.status,
      },
    })),
  };
}

export function buildIssueFeatureCollection(
  issues = seedIssues,
): DemoFeatureCollection {
  return {
    type: "FeatureCollection",
    features: issues
      .filter((issue) => issue.status !== "resolved")
      .map((issue) => ({
        type: "Feature",
        id: issue.id,
        geometry: {
          type: "Point",
          coordinates: issue.coordinates,
        },
        properties: {
          issueId: issue.id,
          assetId: issue.assetId,
          title: issue.title,
          severity: issue.severity,
          status: issue.status,
          priorityScore: issue.priorityScore,
        },
      })),
  };
}
