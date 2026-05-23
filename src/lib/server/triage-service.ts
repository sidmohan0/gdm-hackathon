import { GoogleGenAI, Type } from "@google/genai";

import {
  getAssetById,
  type LngLat,
  seedIssues,
} from "@/data/presidio-demo";
import {
  buildAssetOperationsContext,
  getNearbyAssets,
} from "@/lib/gis-context";
import {
  buildTriagePrompt,
  parseTriageJsonText,
  triageCategories,
  triageSeverities,
  validateTriageResult,
  type TriageResult,
} from "@/lib/triage";

export const TRIAGE_MODEL = "gemini-3.5-flash";

export class TriageError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
  }
}

type AnalyzePhotoInput = {
  assetId: string;
  note: string;
  clickedCoordinates: LngLat;
  photoBytes: ArrayBuffer;
  mimeType: string;
};

const submitTriageFunction = {
  name: "submit_triage",
  description:
    "Submit one validated golf course irrigation photo triage result.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      category: {
        type: Type.STRING,
        enum: [...triageCategories],
      },
      severity: {
        type: Type.STRING,
        enum: [...triageSeverities],
      },
      likelyAssetId: {
        type: Type.STRING,
        description:
          "The likely GIS fieldId, such as head-1f1, not the internal PGC id.",
      },
      likelyAssetType: {
        type: Type.STRING,
        enum: ["sprinkler", "pipe", "valve", "controller", "unknown"],
      },
      summary: { type: Type.STRING },
      evidence: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      recommendedActions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      possibleParts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      workOrderTitle: { type: Type.STRING },
      workOrderPriority: {
        type: Type.STRING,
        enum: [...triageSeverities],
      },
      confidence: { type: Type.NUMBER },
    },
    required: [
      "title",
      "category",
      "severity",
      "likelyAssetId",
      "likelyAssetType",
      "summary",
      "evidence",
      "recommendedActions",
      "possibleParts",
      "workOrderTitle",
      "workOrderPriority",
      "confidence",
    ],
  },
};

function sanitizeError(error: unknown) {
  if (error instanceof TriageError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240);
  }

  return "Unknown Gemini triage error";
}

function buildContext({
  assetId,
  note,
  clickedCoordinates,
}: Pick<AnalyzePhotoInput, "assetId" | "note" | "clickedCoordinates">) {
  const selectedAsset = getAssetById(assetId);

  if (!selectedAsset) {
    throw new TriageError("Selected asset was not found.", 400);
  }

  const nearbyAssets = getNearbyAssets(assetId).map((candidate) => ({
    id: candidate.asset.id,
    fieldId: candidate.asset.fieldId,
    type: candidate.asset.type,
    name: candidate.asset.name,
    distanceMeters: Math.round(candidate.distanceMeters),
  }));
  const operationsContext = buildAssetOperationsContext(assetId, seedIssues);
  const nearbyOpenIssues = [
    ...(operationsContext?.openIssues ?? []),
    ...(operationsContext?.nearbyIssues ?? []),
  ].map((issue) => ({
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    status: issue.status,
    summary: issue.summary,
  }));

  return {
    selectedAsset,
    clickedCoordinates,
    superintendentNote: note.trim(),
    nearbyAssets,
    nearbyOpenIssues,
  };
}

function candidateFromResponse(response: {
  functionCalls?: Array<{
    name?: string;
    args?: unknown;
  }>;
  text?: string;
}) {
  const functionCall = response.functionCalls?.find(
    (call) => call.name === submitTriageFunction.name,
  );

  if (functionCall?.args) {
    return functionCall.args;
  }

  return parseTriageJsonText(response.text ?? "");
}

export async function analyzePhotoWithGemini(
  input: AnalyzePhotoInput,
): Promise<TriageResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new TriageError("Gemini key missing.", 500);
  }

  try {
    const context = buildContext(input);
    const prompt = buildTriagePrompt(context);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TRIAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: Buffer.from(input.photoBytes).toString("base64"),
                mimeType: input.mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        tools: [{ functionDeclarations: [submitTriageFunction] }],
      },
    });

    return validateTriageResult(candidateFromResponse(response));
  } catch (error) {
    if (error instanceof TriageError) {
      throw error;
    }

    throw new TriageError(`Gemini triage failed: ${sanitizeError(error)}.`);
  }
}
