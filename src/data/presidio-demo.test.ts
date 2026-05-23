import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEMO_PHOTO_PATH,
  isCoordinateInsidePresidio,
  presidioAssets,
  seedIssues,
} from "@/data/presidio-demo";

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

describe("presidio demo seed data", () => {
  it("uses stable unique IDs for all assets and issues", () => {
    const assetIds = presidioAssets.map((asset) => asset.id);
    const issueIds = seedIssues.map((issue) => issue.id);

    expect(uniqueCount(assetIds)).toBe(assetIds.length);
    expect(uniqueCount(issueIds)).toBe(issueIds.length);
    expect(assetIds.every((id) => id.startsWith("PGC-"))).toBe(true);
    expect(issueIds.every((id) => id.startsWith("PGC-ISS-"))).toBe(true);
  });

  it("keeps issue references and all coordinates inside the Presidio bounds", () => {
    const assetIds = new Set(presidioAssets.map((asset) => asset.id));

    for (const asset of presidioAssets) {
      expect(isCoordinateInsidePresidio(asset.coordinates)).toBe(true);
    }

    for (const issue of seedIssues) {
      expect(assetIds.has(issue.assetId)).toBe(true);
      expect(isCoordinateInsidePresidio(issue.coordinates)).toBe(true);
    }
  });

  it("has the primary demo image available under public", () => {
    const publicPath = DEMO_PHOTO_PATH.replace(/^\//, "");
    const absolutePath = join(process.cwd(), "public", publicPath);

    expect(existsSync(absolutePath)).toBe(true);
  });
});
