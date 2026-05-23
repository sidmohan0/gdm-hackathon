import { GoogleGenAI } from "@google/genai";
import { ZodError, z } from "zod";

import {
  presidioAssets,
  type IssueSeverity,
  type IssueStatus,
} from "@/data/presidio-demo";
import { dailyPlanResponseSchema } from "@/lib/daily-plan";
import type { ActivityLogEntry } from "@/lib/generated-work";
import {
  MORNING_BRIEF_AGENT,
  buildMorningBriefPayload,
  createEmptyMorningBriefTrace,
  markMorningBriefTraceFailed,
  morningBriefResponseJsonSchema,
  setMorningBriefTraceStepStatus,
  validateMorningBriefResponse,
  type MorningBrief,
  type MorningBriefModelDetails,
  type MorningBriefRankingSource,
  type MorningBriefTraceStageId,
  type MorningBriefTraceStep,
} from "@/lib/morning-brief";
import { getOpenMeteoWeather } from "@/lib/server/weather-service";
import { parseTriageJsonText } from "@/lib/triage";
import type { WeatherSnapshot } from "@/lib/weather";

export class MorningBriefError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly trace: MorningBriefTraceStep[] = [],
    public readonly modelDetails: MorningBriefModelDetails | null = null,
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

const morningBriefIssueSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  fieldId: z.string().optional(),
  title: z.string().min(1),
  severity: z.enum(issueSeverityValues),
  status: z.enum(issueStatusValues),
  openedAt: z.string().min(1),
  priorityScore: z.number(),
  summary: z.string().min(1),
  recommendedAction: z.string().min(1),
  source: z.enum(["seed", "generated"]).optional(),
  workOrderId: z.string().optional(),
  confidence: z.number().optional(),
});

const morningBriefWorkOrderSchema = z.object({
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
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const activityLogEntrySchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  workOrderId: z.string().min(1),
  event: z.enum(["created", "replaced"]),
  message: z.string().min(1),
  createdAt: z.string().min(1),
});

export const morningBriefRequestSchema = z.object({
  issues: z.array(morningBriefIssueSchema).min(1),
  workOrders: z.array(morningBriefWorkOrderSchema).default([]),
  activityLog: z.array(activityLogEntrySchema).default([]),
  dailyPlan: dailyPlanResponseSchema.nullable().optional(),
});

type MorningBriefInput = z.infer<typeof morningBriefRequestSchema>;

type ManagedAgentInteraction = {
  id?: string;
  status?: string;
  environment_id?: string;
  output_text?: string;
};

function sanitizeError(error: unknown) {
  if (error instanceof MorningBriefError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240);
  }

  return "Unknown managed-agent brief error";
}

function createModelDetails(
  overrides: Partial<MorningBriefModelDetails> = {},
): MorningBriefModelDetails {
  return {
    agentId: MORNING_BRIEF_AGENT,
    requestedAt: null,
    completedAt: null,
    requestLatencyMs: null,
    validationStatus: "not_started",
    responseSource: "none",
    failureStage: null,
    failureMessage: null,
    interactionId: null,
    environmentId: null,
    openWorkCount: 0,
    workOrderCount: 0,
    activityLogCount: 0,
    weatherStatus: "unavailable",
    rankingSource: "severity_fallback",
    network: "disabled",
    tools: "none",
    ...overrides,
  };
}

function validationFailureMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "Managed-agent brief failed schema validation.";
  }

  return `Managed-agent brief failed validation: ${sanitizeError(error)}.`;
}

function buildSystemInstruction() {
  return [
    "You are generating a Morning Superintendent Brief for golf course irrigation operations.",
    "Use only the supplied product-state JSON. Do not browse, search, fetch URLs, infer outside facts, or create new operational records.",
    "The brief is advisory only. It must not create, update, rank, reorder, or highlight Issues or WorkOrders.",
    "Every top priority must cite an existing issueId and assetId exactly as supplied. Cite workOrderId only when one is supplied for that issue.",
    "Crew planning must stay coarse: use generic roles such as irrigation tech, assistant, or superintendent; do not name staff or precise dispatch times.",
    "If weather context is unavailable, continue and make that uncertainty visible.",
    "Return only JSON that matches the requested schema.",
  ].join("\n");
}

export function buildMorningBriefAgentInput(
  payload: ReturnType<typeof buildMorningBriefPayload>,
) {
  return [
    "Generate a Morning Superintendent Brief with this exact structure:",
    "- openingSummary",
    "- topPriorities",
    "- weatherWatch",
    "- crewPlan",
    "- risksToVerify",
    "",
    "Use the ranking order from payload.ranking.items. If the ranking source is severity_fallback, say the plan is based on current severity and existing issue order, not a Gemini Prioritize run.",
    "Use only coarse crew windows: morning, midday, after_first_inspection.",
    "Keep the language operational and concise.",
    "",
    `Supplied product state JSON:\n${JSON.stringify(payload)}`,
  ].join("\n");
}

function extractCandidate(interaction: ManagedAgentInteraction) {
  if (!interaction.output_text) {
    throw new Error("Gemini managed agent returned no text payload.");
  }

  return parseTriageJsonText(interaction.output_text);
}

function buildReferenceContext(input: MorningBriefInput) {
  return {
    issues: input.issues
      .filter((issue) => issue.status !== "resolved")
      .map((issue) => ({
        id: issue.id,
        assetId: issue.assetId,
        workOrderId: issue.workOrderId,
      })),
    workOrders: input.workOrders.map((workOrder) => ({
      id: workOrder.id,
      issueId: workOrder.issueId,
      assetId: workOrder.assetId,
    })),
    assetIds: presidioAssets.map((asset) => asset.id),
  };
}

function fail({
  trace,
  modelDetails,
  stage,
  message,
  status,
  completedAt,
  latencyMs,
}: {
  trace: MorningBriefTraceStep[];
  modelDetails: MorningBriefModelDetails;
  stage: MorningBriefTraceStageId;
  message: string;
  status: number;
  completedAt?: string;
  latencyMs?: number;
}): never {
  const nextTrace = markMorningBriefTraceFailed(
    trace,
    stage,
    message,
    completedAt,
    latencyMs,
  );

  throw new MorningBriefError(message, status, nextTrace, {
    ...modelDetails,
    completedAt: completedAt ?? modelDetails.completedAt,
    requestLatencyMs: latencyMs ?? modelDetails.requestLatencyMs,
    failureStage: stage,
    failureMessage: message,
  });
}

export async function generateMorningBrief(
  rawInput: unknown,
): Promise<{
  brief: MorningBrief;
  trace: MorningBriefTraceStep[];
  modelDetails: MorningBriefModelDetails;
}> {
  const parsed = morningBriefRequestSchema.parse(rawInput);
  const openWorkCount = parsed.issues.filter(
    (issue) => issue.status !== "resolved",
  ).length;
  let trace = createEmptyMorningBriefTrace();
  let modelDetails = createModelDetails({
    openWorkCount,
    workOrderCount: parsed.workOrders.length,
    activityLogCount: parsed.activityLog.length,
  });

  if (openWorkCount === 0) {
    fail({
      trace,
      modelDetails,
      stage: "open_work_loaded",
      message: "No open work is available for a Morning Superintendent Brief.",
      status: 400,
    });
  }

  trace = setMorningBriefTraceStepStatus(
    trace,
    "open_work_loaded",
    "complete",
    {
      detail: `${openWorkCount} open issues, ${parsed.workOrders.length} work orders, and ${parsed.activityLog.length} activity events loaded.`,
    },
  );

  const weather = await getOpenMeteoWeather();

  trace = setMorningBriefTraceStepStatus(
    trace,
    "weather_context_loaded",
    "complete",
    {
      detail:
        weather.status === "available"
          ? "Open-Meteo weather attached to the supplied managed-agent payload."
          : `Proceeding with weather unavailable: ${
              weather.reason ?? "Open-Meteo did not return data."
            }`,
    },
  );
  modelDetails = {
    ...modelDetails,
    weatherStatus: weather.status,
  };

  const payload = buildMorningBriefPayload({
    issues: parsed.issues,
    workOrders: parsed.workOrders,
    activityLog: parsed.activityLog as ActivityLogEntry[],
    dailyPlan: parsed.dailyPlan ?? null,
    weather: weather as WeatherSnapshot,
  });
  const rankingSource = payload.ranking.source;

  trace = setMorningBriefTraceStepStatus(
    trace,
    "managed_agent_payload_prepared",
    "complete",
    {
      detail:
        rankingSource === "daily_plan"
          ? "Payload includes the latest Prioritize ranking."
          : "Payload uses severity fallback because no Prioritize ranking exists.",
    },
  );
  modelDetails = {
    ...modelDetails,
    rankingSource,
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    fail({
      trace,
      modelDetails,
      stage: "managed_agent_requested",
      message: "Gemini API key is not configured.",
      status: 500,
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const requestedAtMs = Date.now();
  const requestedAt = new Date(requestedAtMs).toISOString();
  let interaction: ManagedAgentInteraction;

  trace = setMorningBriefTraceStepStatus(
    trace,
    "managed_agent_requested",
    "running",
    {
      at: requestedAt,
      detail:
        "Requesting hosted Antigravity through the Gemini Interactions API with remote network disabled and no tools.",
    },
  );
  modelDetails = {
    ...modelDetails,
    requestedAt,
  };

  try {
    interaction = (await ai.interactions.create(
      {
        agent: MORNING_BRIEF_AGENT,
        input: buildMorningBriefAgentInput(payload),
        environment: {
          type: "remote",
          network: "disabled",
        },
        tools: [],
        system_instruction: buildSystemInstruction(),
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: morningBriefResponseJsonSchema,
        },
        response_modalities: ["text"],
      },
      {
        timeout: 300_000,
      },
    )) as ManagedAgentInteraction;
  } catch (error) {
    const completedAtMs = Date.now();
    const completedAt = new Date(completedAtMs).toISOString();
    const requestLatencyMs = completedAtMs - requestedAtMs;
    const message = `Gemini managed-agent brief failed: ${sanitizeError(error)}.`;

    fail({
      trace,
      modelDetails,
      stage: "managed_agent_requested",
      message,
      status: 502,
      completedAt,
      latencyMs: requestLatencyMs,
    });
  }

  const completedAtMs = Date.now();
  const completedAt = new Date(completedAtMs).toISOString();
  const requestLatencyMs = completedAtMs - requestedAtMs;

  if (interaction.status && interaction.status !== "completed") {
    fail({
      trace,
      modelDetails: {
        ...modelDetails,
        interactionId: interaction.id ?? null,
        environmentId: interaction.environment_id ?? null,
      },
      stage: "managed_agent_requested",
      message: `Gemini managed agent did not complete; status was ${interaction.status}.`,
      status: 502,
      completedAt,
      latencyMs: requestLatencyMs,
    });
  }

  trace = setMorningBriefTraceStepStatus(
    trace,
    "managed_agent_requested",
    "complete",
    {
      at: completedAt,
      latencyMs: requestLatencyMs,
      detail: `Managed agent returned interaction ${interaction.id ?? "without id"}.`,
    },
  );
  trace = setMorningBriefTraceStepStatus(trace, "brief_validated", "running", {
    at: completedAt,
    detail: "Checking schema and issue, work-order, and asset references.",
  });
  modelDetails = {
    ...modelDetails,
    completedAt,
    requestLatencyMs,
    responseSource: interaction.output_text ? "output_text_json" : "none",
    interactionId: interaction.id ?? null,
    environmentId: interaction.environment_id ?? null,
  };

  let validated;

  try {
    validated = validateMorningBriefResponse(
      extractCandidate(interaction),
      buildReferenceContext(parsed),
    );
  } catch (error) {
    const message = validationFailureMessage(error);

    fail({
      trace,
      modelDetails: {
        ...modelDetails,
        validationStatus: "failed",
      },
      stage: "brief_validated",
      message,
      status: 422,
    });
  }

  trace = setMorningBriefTraceStepStatus(trace, "brief_validated", "complete", {
    detail:
      "Brief accepted; it remains advisory and does not mutate Issues or WorkOrders.",
  });
  modelDetails = {
    ...modelDetails,
    validationStatus: "passed",
  };

  return {
    brief: {
      id: "GDM-MORNING-BRIEF",
      generatedAt: new Date().toISOString(),
      source: "Gemini managed agent",
      agentId: MORNING_BRIEF_AGENT,
      interactionId: interaction.id ?? null,
      environmentId: interaction.environment_id ?? null,
      weather,
      rankingSource: rankingSource as MorningBriefRankingSource,
      ...validated,
    },
    trace,
    modelDetails,
  };
}

export type MorningBriefRequestIssue = z.infer<
  typeof morningBriefIssueSchema
> & {
  severity: IssueSeverity;
  status: IssueStatus;
};
