import { describe, expect, it } from "vitest";

import { seedIssues } from "@/data/presidio-demo";
import {
  buildAssetOperationsContext,
  getNearbyOpenIssues,
  metersBetween,
  sortIssuesByOperationalPriority,
} from "@/lib/gis-context";

describe("gis context helpers", () => {
  it("measures nearby course coordinates in meters", () => {
    const distance = metersBetween(
      [-122.46512, 37.79222],
      [-122.46508, 37.79223],
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(10);
  });

  it("builds selected asset context with direct and nearby open issues", () => {
    const context = buildAssetOperationsContext("PGC-SH-014");

    expect(context?.asset.id).toBe("PGC-SH-014");
    expect(context?.openIssues.map((issue) => issue.id)).toContain(
      "PGC-ISS-101",
    );
    expect(context?.nearbyIssues.map((issue) => issue.id)).toContain(
      "PGC-ISS-102",
    );
  });

  it("sorts operational issues by severity before priority score", () => {
    const sorted = sortIssuesByOperationalPriority(seedIssues);

    expect(sorted[0].id).toBe("PGC-ISS-102");
    expect(sorted[1].id).toBe("PGC-ISS-101");
  });

  it("returns an empty context for unknown assets", () => {
    expect(getNearbyOpenIssues("PGC-NOT-REAL")).toEqual([]);
    expect(buildAssetOperationsContext("PGC-NOT-REAL")).toBeNull();
  });
});
