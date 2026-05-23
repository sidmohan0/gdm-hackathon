import { z } from "zod";

import type {
  AssetType,
  DemoAsset,
  DemoIssue,
  LngLat,
} from "@/data/presidio-demo";

export const triageCategories = [
  "irrigation_leak",
  "sprinkler_damage",
  "standing_water",
  "turf_stress",
  "unknown",
] as const;

export const triageSeverities = ["low", "medium", "high", "urgent"] as const;

export const triageResultSchema = z.object({
  title: z.string().min(4),
  category: z.enum(triageCategories),
  severity: z.enum(triageSeverities),
  likelyAssetId: z.string().min(2),
  likelyAssetType: z.enum([
    "sprinkler",
    "pipe",
    "valve",
    "controller",
    "unknown",
  ]),
  summary: z.string().min(12),
  evidence: z.array(z.string().min(3)).min(1),
  recommendedActions: z.array(z.string().min(3)).min(1),
  possibleParts: z.array(z.string().min(2)).default([]),
  workOrderTitle: z.string().min(4),
  workOrderPriority: z.enum(triageSeverities),
  confidence: z.number().min(0).max(1),
});

export type TriageResult = z.infer<typeof triageResultSchema>;

export type TriagePromptContext = {
  selectedAsset: DemoAsset;
  clickedCoordinates: LngLat;
  superintendentNote: string;
  nearbyAssets: Array<{
    id: string;
    fieldId: string;
    type: AssetType;
    name: string;
    distanceMeters: number;
  }>;
  nearbyOpenIssues: Array<{
    id: string;
    title: string;
    severity: DemoIssue["severity"];
    status: DemoIssue["status"];
    summary: string;
  }>;
};

export function validateTriageResult(candidate: unknown) {
  return triageResultSchema.parse(candidate);
}

export function parseTriageJsonText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Gemini returned no text payload.");
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("Gemini text payload did not contain a JSON object.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

export function buildTriagePrompt(context: TriagePromptContext) {
  return [
    "You are helping a golf course superintendent triage an irrigation field photo.",
    "Use only the image and the selected GIS context below. Do not invent assets, parts, or certainty.",
    "Reason conservatively using golf-course irrigation best management practices: isolate water waste, protect mower/player safety, reduce turf stress, and verify before excavation.",
    "If the image evidence is weak, lower confidence and say what should be checked next.",
    "Return the triage by calling submit_triage. The likelyAssetId must use the GIS fieldId namespace, not the internal PGC id.",
    "Prefer the selected asset fieldId when the photo evidence aligns with that asset.",
    "",
    `Selected asset: ${JSON.stringify({
      id: context.selectedAsset.id,
      fieldId: context.selectedAsset.fieldId,
      type: context.selectedAsset.type,
      name: context.selectedAsset.name,
      zone: context.selectedAsset.zone,
      hole: context.selectedAsset.hole,
      status: context.selectedAsset.status,
      metrics: context.selectedAsset.metrics,
      notes: context.selectedAsset.notes,
    })}`,
    `Clicked coordinates: ${JSON.stringify(context.clickedCoordinates)}`,
    `Superintendent note: ${context.superintendentNote || "None provided."}`,
    `Nearby assets: ${JSON.stringify(context.nearbyAssets)}`,
    `Nearby open issues: ${JSON.stringify(context.nearbyOpenIssues)}`,
  ].join("\n");
}
