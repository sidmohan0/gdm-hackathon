import { describe, expect, it } from "vitest";

import { getAssetById } from "@/data/presidio-demo";
import {
  buildTriagePrompt,
  parseTriageJsonText,
  validateTriageResult,
} from "@/lib/triage";

const validTriage = {
  title: "Standing water around sprinkler head",
  category: "irrigation_leak",
  severity: "high",
  likelyAssetId: "head-1f1",
  likelyAssetType: "sprinkler",
  summary: "Photo shows standing water around the selected sprinkler head.",
  evidence: ["Standing water is visible at the head."],
  recommendedActions: ["Isolate the zone and inspect the head assembly."],
  possibleParts: ["riser seal", "rotor head"],
  workOrderTitle: "Inspect leaking sprinkler head head-1f1",
  workOrderPriority: "high",
  confidence: 0.82,
};

describe("Gemini triage contract", () => {
  it("validates the operational triage result shape", () => {
    expect(validateTriageResult(validTriage).likelyAssetId).toBe("head-1f1");
  });

  it("extracts JSON from plain or fenced model text", () => {
    expect(parseTriageJsonText(JSON.stringify(validTriage))).toEqual(
      validTriage,
    );
    expect(parseTriageJsonText(`\`\`\`json\n${JSON.stringify(validTriage)}\n\`\`\``))
      .toEqual(validTriage);
  });

  it("builds an honest prompt with GIS context but not a forced answer", () => {
    const selectedAsset = getAssetById("PGC-SH-014");

    if (!selectedAsset) {
      throw new Error("Missing test asset");
    }

    const prompt = buildTriagePrompt({
      selectedAsset,
      clickedCoordinates: selectedAsset.coordinates,
      superintendentNote: "Wet after the morning cycle.",
      nearbyAssets: [],
      nearbyOpenIssues: [],
    });

    expect(prompt).toContain("head-1f1");
    expect(prompt).toContain("Use only the image");
    expect(prompt).not.toContain("The answer is");
  });
});
