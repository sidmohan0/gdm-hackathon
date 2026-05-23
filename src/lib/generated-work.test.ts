import { describe, expect, it } from "vitest";

import { getAssetById } from "@/data/presidio-demo";
import {
  buildGeneratedArtifacts,
  generatedIdsForAsset,
} from "@/lib/generated-work";

const triage = {
  title: "Active leak at head 1F1",
  category: "irrigation_leak",
  severity: "high",
  likelyAssetId: "head-1f1",
  likelyAssetType: "sprinkler",
  summary: "Standing water and bubbling around the sprinkler head.",
  evidence: ["Standing water around the head."],
  recommendedActions: ["Isolate the zone.", "Inspect the riser."],
  possibleParts: ["riser seal"],
  workOrderTitle: "Repair leaking head 1F1",
  workOrderPriority: "high",
  confidence: 0.9,
} as const;

describe("generated work artifacts", () => {
  it("uses deterministic readable IDs for generated objects", () => {
    const asset = getAssetById("PGC-SH-014");

    if (!asset) {
      throw new Error("Missing test asset");
    }

    expect(generatedIdsForAsset(asset)).toEqual({
      observationId: "GDM-OBS-HEAD-1F1",
      issueId: "GDM-ISS-HEAD-1F1",
      workOrderId: "GDM-WO-HEAD-1F1",
    });
  });

  it("creates linked observation, issue, work order, and activity log", () => {
    const asset = getAssetById("PGC-SH-014");

    if (!asset) {
      throw new Error("Missing test asset");
    }

    const artifacts = buildGeneratedArtifacts({
      asset,
      triage,
      clickedCoordinates: asset.coordinates,
      photoName: "demo-image.png",
      note: "Wet after cycle.",
      logSequence: 1,
      replacesExisting: false,
      now: "2026-05-23T22:00:00.000Z",
    });

    expect(artifacts.observation.id).toBe("GDM-OBS-HEAD-1F1");
    expect(artifacts.issue.id).toBe("GDM-ISS-HEAD-1F1");
    expect(artifacts.issue.workOrderId).toBe("GDM-WO-HEAD-1F1");
    expect(artifacts.issue.coordinates).toEqual(asset.coordinates);
    expect(artifacts.workOrder.status).toBe("draft");
    expect(artifacts.activityLogEntry.event).toBe("created");
  });

  it("records replacement activity for repeated analysis", () => {
    const asset = getAssetById("PGC-SH-014");

    if (!asset) {
      throw new Error("Missing test asset");
    }

    const artifacts = buildGeneratedArtifacts({
      asset,
      triage,
      clickedCoordinates: asset.coordinates,
      photoName: "demo-image.png",
      note: "",
      logSequence: 2,
      replacesExisting: true,
    });

    expect(artifacts.activityLogEntry.id).toBe("GDM-LOG-HEAD-1F1-2");
    expect(artifacts.activityLogEntry.event).toBe("replaced");
  });
});
