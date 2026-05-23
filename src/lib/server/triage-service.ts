import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import { ZodError } from "zod";

import {
  getAssetById,
  type LngLat,
  seedIssues,
} from "@/data/presidio-demo";
import {
  type AgentTraceStep,
  type AnalysisModelDetails,
  type ModelResponseSource,
  createPhotoReceivedTrace,
  markTraceFailed,
  setTraceStepStatus,
} from "@/lib/agent-trace";
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
    public readonly trace: AgentTraceStep[] = [],
    public readonly modelDetails: AnalysisModelDetails | null = null,
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
  photoName?: string;
};

export type TriageAnalysis = {
  result: TriageResult;
  trace: AgentTraceStep[];
  modelDetails: AnalysisModelDetails;
  analyzedAt: string;
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

export const triageFunctionCallingConfig = {
  mode: FunctionCallingConfigMode.ANY,
  allowedFunctionNames: [submitTriageFunction.name],
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

function responseSource(response: {
  functionCalls?: Array<{
    name?: string;
    args?: unknown;
  }>;
  text?: string;
}): ModelResponseSource {
  const functionCall = response.functionCalls?.find(
    (call) => call.name === submitTriageFunction.name,
  );

  if (functionCall?.args) {
    return "function_call";
  }

  return response.text ? "text_json" : "none";
}

function candidateFromResponse(
  response: {
    functionCalls?: Array<{
      name?: string;
      args?: unknown;
    }>;
    text?: string;
  },
  source: ModelResponseSource,
) {
  if (source === "function_call") {
    const functionCall = response.functionCalls?.find(
      (call) => call.name === submitTriageFunction.name,
    );

    return functionCall?.args;
  }

  if (source === "text_json") {
    return parseTriageJsonText(response.text ?? "");
  }

  throw new Error("Gemini returned no structured triage payload.");
}

function createModelDetails(
  overrides: Partial<AnalysisModelDetails> = {},
): AnalysisModelDetails {
  return {
    modelId: TRIAGE_MODEL,
    requestedAt: null,
    completedAt: null,
    requestLatencyMs: null,
    validationStatus: "not_started",
    responseSource: "none",
    failureStage: null,
    failureMessage: null,
    selectedAssetFieldId: null,
    nearbyAssetCount: null,
    openIssueContextCount: null,
    photoMimeType: null,
    ...overrides,
  };
}

function validationFailureMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "Gemini structured output failed validation.";
  }

  return `Gemini structured output could not be parsed: ${sanitizeError(error)}.`;
}

export async function analyzePhotoWithGemini(
  input: AnalyzePhotoInput,
): Promise<TriageAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  let trace = createPhotoReceivedTrace({
    photoName: input.photoName ?? "field photo",
    mimeType: input.mimeType,
  });
  let modelDetails = createModelDetails({ photoMimeType: input.mimeType });

  if (!apiKey) {
    trace = markTraceFailed(
      trace,
      "gemini_requested",
      "Gemini API key is not configured.",
    );
    modelDetails = createModelDetails({
      photoMimeType: input.mimeType,
      failureStage: "gemini_requested",
      failureMessage: "Gemini API key is not configured.",
    });

    throw new TriageError("Gemini key missing.", 500, trace, modelDetails);
  }

  try {
    let context: ReturnType<typeof buildContext>;

    try {
      context = buildContext(input);
      trace = setTraceStepStatus(trace, "gis_context_built", "complete", {
        detail: `${context.selectedAsset.fieldId} with ${context.nearbyAssets.length} nearby assets and ${context.nearbyOpenIssues.length} open issue signals.`,
      });
      modelDetails = createModelDetails({
        photoMimeType: input.mimeType,
        selectedAssetFieldId: context.selectedAsset.fieldId,
        nearbyAssetCount: context.nearbyAssets.length,
        openIssueContextCount: context.nearbyOpenIssues.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to build GIS context.";

      trace = markTraceFailed(trace, "gis_context_built", message);
      modelDetails = createModelDetails({
        photoMimeType: input.mimeType,
        failureStage: "gis_context_built",
        failureMessage: message,
      });

      throw new TriageError(message, 400, trace, modelDetails);
    }

    const prompt = buildTriagePrompt(context);
    const ai = new GoogleGenAI({ apiKey });
    const requestedAtMs = Date.now();
    const requestedAt = new Date(requestedAtMs).toISOString();
    let response: Awaited<ReturnType<typeof ai.models.generateContent>>;

    trace = setTraceStepStatus(trace, "gemini_requested", "running", {
      at: requestedAt,
      detail: "Requesting Gemini with the photo, GIS context, and BMP-informed triage instructions.",
    });
    modelDetails = {
      ...modelDetails,
      requestedAt,
    };

    try {
      response = await ai.models.generateContent({
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
          toolConfig: {
            functionCallingConfig: triageFunctionCallingConfig,
          },
        },
      });
    } catch (error) {
      const completedAtMs = Date.now();
      const completedAt = new Date(completedAtMs).toISOString();
      const requestLatencyMs = completedAtMs - requestedAtMs;
      const message = `Gemini triage failed: ${sanitizeError(error)}.`;

      trace = markTraceFailed(
        trace,
        "gemini_requested",
        message,
        completedAt,
        requestLatencyMs,
      );
      modelDetails = {
        ...modelDetails,
        completedAt,
        requestLatencyMs,
        failureStage: "gemini_requested",
        failureMessage: message,
      };

      throw new TriageError(message, 502, trace, modelDetails);
    }

    const completedAtMs = Date.now();
    const completedAt = new Date(completedAtMs).toISOString();
    const requestLatencyMs = completedAtMs - requestedAtMs;
    const source = responseSource(response);

    trace = setTraceStepStatus(trace, "gemini_requested", "complete", {
      at: completedAt,
      latencyMs: requestLatencyMs,
      detail: "Gemini returned a candidate work-order triage response.",
    });
    trace = setTraceStepStatus(
      trace,
      "structured_output_validated",
      "running",
      {
        at: completedAt,
        detail: "Checking function-call/text output against the triage schema.",
      },
    );
    modelDetails = {
      ...modelDetails,
      completedAt,
      requestLatencyMs,
      responseSource: source,
    };

    let result: TriageResult;

    try {
      result = validateTriageResult(candidateFromResponse(response, source));
    } catch (error) {
      const message = validationFailureMessage(error);

      trace = markTraceFailed(
        trace,
        "structured_output_validated",
        message,
        new Date().toISOString(),
      );
      modelDetails = {
        ...modelDetails,
        validationStatus: "failed",
        failureStage: "structured_output_validated",
        failureMessage: message,
      };

      throw new TriageError(message, 422, trace, modelDetails);
    }

    trace = setTraceStepStatus(
      trace,
      "structured_output_validated",
      "complete",
      {
        detail: "Schema accepted; no local issue or work order was created before this point.",
      },
    );
    trace = setTraceStepStatus(trace, "priority_assigned", "complete", {
      detail: `${result.severity} severity at ${Math.round(
        result.confidence * 100,
      )}% confidence maps to ${result.workOrderPriority} work-order priority.`,
    });
    modelDetails = {
      ...modelDetails,
      validationStatus: "passed",
    };

    return {
      result,
      trace,
      modelDetails,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof TriageError) {
      throw error;
    }

    const message = `Gemini triage failed: ${sanitizeError(error)}.`;

    trace = markTraceFailed(trace, "gemini_requested", message);
    modelDetails = {
      ...modelDetails,
      failureStage: "gemini_requested",
      failureMessage: message,
    };

    throw new TriageError(message, 502, trace, modelDetails);
  }
}
