import { GoogleGenAI, Type } from "@google/genai";
import { ZodError, z } from "zod";

import {
  getAssetById,
  type IssueSeverity,
  type IssueStatus,
} from "@/data/presidio-demo";
import {
  PRIORITIZATION_MODEL,
  type DailyPlan,
  type PrioritizationModelDetails,
  type PrioritizationRequestIssue,
  type PrioritizationRequestWorkOrder,
  type PrioritizationTraceStep,
  createEmptyPrioritizationTrace,
  markPrioritizationTraceFailed,
  setPrioritizationTraceStepStatus,
  validateDailyPlanResponse,
} from "@/lib/daily-plan";
import { getOpenMeteoWeather } from "@/lib/server/weather-service";
import { parseTriageJsonText } from "@/lib/triage";
import { formatMetric, type WeatherSnapshot } from "@/lib/weather";

export class PrioritizationError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly trace: PrioritizationTraceStep[] = [],
    public readonly modelDetails: PrioritizationModelDetails | null = null,
  ) {
    super(message);
  }
}

const issueSeverityValues = ["low", "medium", "high", "critical"] as const;
const issueStatusValues = [
  "open",
  "scheduled",
  "monitoring",
  "resolved",
] as const;

const prioritizationIssueSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  fieldId: z.string().optional(),
  title: z.string().min(1),
  severity: z.enum(issueSeverityValues),
  status: z.enum(issueStatusValues),
  priorityScore: z.number(),
  summary: z.string().min(1),
  recommendedAction: z.string().min(1),
  source: z.enum(["seed", "generated"]).optional(),
  workOrderId: z.string().optional(),
  confidence: z.number().optional(),
});

const prioritizationWorkOrderSchema = z.object({
  id: z.string().min(1),
  issueId: z.string().min(1),
  assetId: z.string().min(1),
  fieldId: z.string().min(1),
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["draft", "ready"]),
  recommendedActions: z.array(z.string()),
  possibleParts: z.array(z.string()),
  confidence: z.number(),
});

export const prioritizeRequestSchema = z.object({
  issues: z.array(prioritizationIssueSchema).min(1),
  workOrders: z.array(prioritizationWorkOrderSchema).default([]),
});

type PrioritizeInput = z.infer<typeof prioritizeRequestSchema>;

type PrioritizationCandidate = {
  issue: PrioritizationRequestIssue;
  asset: {
    id: string;
    fieldId: string;
    type: string;
    name: string;
    status: string;
    hole: string;
    zone: string;
    metrics: Record<string, number | undefined>;
    notes: string;
  } | null;
  workOrder: PrioritizationRequestWorkOrder | null;
};

function sanitizeError(error: unknown) {
  if (error instanceof PrioritizationError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240);
  }

  return "Unknown Gemini prioritization error";
}

function weatherLine(weather: WeatherSnapshot) {
  if (weather.status === "unavailable") {
    return `Open-Meteo unavailable: ${weather.reason ?? "no reason provided"}`;
  }

  return [
    `Open-Meteo available for ${weather.location}`,
    weather.observedAt ? `observed ${weather.observedAt}` : null,
    formatMetric(weather.temperature)
      ? `temperature ${formatMetric(weather.temperature)}`
      : null,
    formatMetric(weather.humidity) ? `RH ${formatMetric(weather.humidity)}` : null,
    formatMetric(weather.windSpeed)
      ? `wind ${formatMetric(weather.windSpeed)}`
      : null,
    formatMetric(weather.precipitation, 2)
      ? `precipitation ${formatMetric(weather.precipitation, 2)}`
      : null,
    formatMetric(weather.precipitationProbability)
      ? `rain probability ${formatMetric(weather.precipitationProbability)}`
      : null,
    formatMetric(weather.evapotranspiration, 2)
      ? `ET0 ${formatMetric(weather.evapotranspiration, 2)}`
      : null,
    formatMetric(weather.soilMoisture, 2)
      ? `soil moisture ${formatMetric(weather.soilMoisture, 2)}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function createModelDetails(
  overrides: Partial<PrioritizationModelDetails> = {},
): PrioritizationModelDetails {
  return {
    modelId: PRIORITIZATION_MODEL,
    requestedAt: null,
    completedAt: null,
    requestLatencyMs: null,
    validationStatus: "not_started",
    responseSource: "none",
    failureStage: null,
    failureMessage: null,
    openWorkCount: 0,
    workOrderCount: 0,
    weatherStatus: "unavailable",
    ...overrides,
  };
}

function buildCandidates(input: PrioritizeInput): PrioritizationCandidate[] {
  const workOrdersByIssueId = new Map(
    input.workOrders.map((workOrder) => [workOrder.issueId, workOrder]),
  );

  return input.issues
    .filter((issue) => issue.status !== "resolved")
    .map((issue) => {
      const asset = getAssetById(issue.assetId);

      return {
        issue,
        asset: asset
          ? {
              id: asset.id,
              fieldId: asset.fieldId,
              type: asset.type,
              name: asset.name,
              status: asset.status,
              hole: asset.hole,
              zone: asset.zone,
              metrics: asset.metrics,
              notes: asset.notes,
            }
          : null,
        workOrder: workOrdersByIssueId.get(issue.id) ?? null,
      };
    });
}

function buildPrioritizationPrompt({
  candidates,
  weather,
}: {
  candidates: PrioritizationCandidate[];
  weather: WeatherSnapshot;
}) {
  return [
    "You are ranking today's golf course irrigation operations work for a superintendent.",
    "Use only the supplied existing issues and linked work orders. Do not create issues, work orders, assets, or new observations.",
    "Rank every supplied work item once. Reference issue IDs exactly as provided.",
    "Prioritize water waste risk, active leaks, mower/player safety, playability impact, severity, weather exposure, and asset context.",
    "Use Open-Meteo weather only as prioritization context. If weather is unavailable, continue and mention that uncertainty in reasons when relevant.",
    "Reason with irrigation best management practices: isolate water waste, prevent further turf damage, protect play, and stage repairs before digging when verification is needed.",
    "Return the plan by calling submit_daily_plan.",
    "",
    `Weather context: ${weatherLine(weather)}`,
    `Candidate work: ${JSON.stringify(
      candidates.map((candidate) => ({
        issue: candidate.issue,
        asset: candidate.asset,
        linkedWorkOrder: candidate.workOrder,
      })),
    )}`,
  ].join("\n");
}

const submitDailyPlanFunction = {
  name: "submit_daily_plan",
  description:
    "Submit one ranked daily plan for existing golf course maintenance issues.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rank: { type: Type.NUMBER },
            issueId: { type: Type.STRING },
            reason: { type: Type.STRING },
            recommendedCrew: { type: Type.STRING },
            estimatedDifficulty: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },
            summary: { type: Type.STRING },
          },
          required: [
            "rank",
            "issueId",
            "reason",
            "recommendedCrew",
            "estimatedDifficulty",
            "summary",
          ],
        },
      },
    },
    required: ["summary", "items"],
  },
};

function responseSource(response: {
  functionCalls?: Array<{
    name?: string;
    args?: unknown;
  }>;
  text?: string;
}) {
  const functionCall = response.functionCalls?.find(
    (call) => call.name === submitDailyPlanFunction.name,
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
  source: PrioritizationModelDetails["responseSource"],
) {
  if (source === "function_call") {
    const functionCall = response.functionCalls?.find(
      (call) => call.name === submitDailyPlanFunction.name,
    );

    return functionCall?.args;
  }

  if (source === "text_json") {
    return parseTriageJsonText(response.text ?? "");
  }

  throw new Error("Gemini returned no daily plan payload.");
}

function validationFailureMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "Gemini daily plan failed schema validation.";
  }

  return `Gemini daily plan failed validation: ${sanitizeError(error)}.`;
}

export async function prioritizeDailyWork(
  rawInput: unknown,
): Promise<{
  dailyPlan: DailyPlan;
  trace: PrioritizationTraceStep[];
  modelDetails: PrioritizationModelDetails;
}> {
  const parsed = prioritizeRequestSchema.parse(rawInput);
  const candidates = buildCandidates(parsed);
  let trace = createEmptyPrioritizationTrace();
  let modelDetails = createModelDetails({
    openWorkCount: candidates.length,
    workOrderCount: parsed.workOrders.length,
  });

  if (candidates.length === 0) {
    trace = markPrioritizationTraceFailed(
      trace,
      "open_work_loaded",
      "No existing open work was available to rank.",
    );
    modelDetails = {
      ...modelDetails,
      failureStage: "open_work_loaded",
      failureMessage: "No existing open work was available to rank.",
    };

    throw new PrioritizationError(
      "No existing open work was available to rank.",
      400,
      trace,
      modelDetails,
    );
  }

  trace = setPrioritizationTraceStepStatus(
    trace,
    "open_work_loaded",
    "complete",
    {
      detail: `${candidates.length} existing work items and ${parsed.workOrders.length} linked work orders loaded.`,
    },
  );

  const weather = await getOpenMeteoWeather();

  trace = setPrioritizationTraceStepStatus(
    trace,
    "weather_context_loaded",
    "complete",
    {
      detail:
        weather.status === "available"
          ? "Open-Meteo context attached for prioritization only."
          : `Proceeding with weather unavailable: ${
              weather.reason ?? "Open-Meteo did not return data."
            }`,
    },
  );
  modelDetails = {
    ...modelDetails,
    weatherStatus: weather.status,
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    trace = markPrioritizationTraceFailed(
      trace,
      "gemini_prioritization_requested",
      "Gemini API key is not configured.",
    );
    modelDetails = {
      ...modelDetails,
      failureStage: "gemini_prioritization_requested",
      failureMessage: "Gemini API key is not configured.",
    };

    throw new PrioritizationError(
      "Gemini key missing.",
      500,
      trace,
      modelDetails,
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const requestedAtMs = Date.now();
  const requestedAt = new Date(requestedAtMs).toISOString();
  const prompt = buildPrioritizationPrompt({ candidates, weather });
  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;

  trace = setPrioritizationTraceStepStatus(
    trace,
    "gemini_prioritization_requested",
    "running",
    {
      at: requestedAt,
      detail: "Requesting Gemini with open work, linked work orders, weather, and BMP ranking criteria.",
    },
  );
  modelDetails = {
    ...modelDetails,
    requestedAt,
  };

  try {
    response = await ai.models.generateContent({
      model: PRIORITIZATION_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        tools: [{ functionDeclarations: [submitDailyPlanFunction] }],
      },
    });
  } catch (error) {
    const completedAtMs = Date.now();
    const completedAt = new Date(completedAtMs).toISOString();
    const requestLatencyMs = completedAtMs - requestedAtMs;
    const message = `Gemini prioritization failed: ${sanitizeError(error)}.`;

    trace = markPrioritizationTraceFailed(
      trace,
      "gemini_prioritization_requested",
      message,
      completedAt,
      requestLatencyMs,
    );
    modelDetails = {
      ...modelDetails,
      completedAt,
      requestLatencyMs,
      failureStage: "gemini_prioritization_requested",
      failureMessage: message,
    };

    throw new PrioritizationError(message, 502, trace, modelDetails);
  }

  const completedAtMs = Date.now();
  const completedAt = new Date(completedAtMs).toISOString();
  const requestLatencyMs = completedAtMs - requestedAtMs;
  const source = responseSource(response);

  trace = setPrioritizationTraceStepStatus(
    trace,
    "gemini_prioritization_requested",
    "complete",
    {
      at: completedAt,
      latencyMs: requestLatencyMs,
      detail: "Gemini returned a candidate ranked daily plan.",
    },
  );
  trace = setPrioritizationTraceStepStatus(
    trace,
    "daily_plan_validated",
    "running",
    {
      at: completedAt,
      detail: "Checking ranks, issue IDs, crew, difficulty, and summary fields.",
    },
  );
  modelDetails = {
    ...modelDetails,
    completedAt,
    requestLatencyMs,
    responseSource: source,
  };

  let validated;

  try {
    validated = validateDailyPlanResponse(
      candidateFromResponse(response, source),
      candidates.map((candidate) => candidate.issue.id),
    );
  } catch (error) {
    const message = validationFailureMessage(error);

    trace = markPrioritizationTraceFailed(
      trace,
      "daily_plan_validated",
      message,
    );
    modelDetails = {
      ...modelDetails,
      validationStatus: "failed",
      failureStage: "daily_plan_validated",
      failureMessage: message,
    };

    throw new PrioritizationError(message, 422, trace, modelDetails);
  }

  trace = setPrioritizationTraceStepStatus(
    trace,
    "daily_plan_validated",
    "complete",
    {
      detail: "Plan accepted; no issue or work-order creation occurs in prioritization.",
    },
  );
  modelDetails = {
    ...modelDetails,
    validationStatus: "passed",
  };

  return {
    dailyPlan: {
      id: "GDM-DAILY-PLAN",
      generatedAt: new Date().toISOString(),
      source: "Gemini",
      modelId: PRIORITIZATION_MODEL,
      weather,
      ...validated,
    },
    trace,
    modelDetails,
  };
}

export type PrioritizedIssueInput = z.infer<typeof prioritizationIssueSchema> & {
  severity: IssueSeverity;
  status: IssueStatus;
};
