import { z } from "zod";

import {
  PRESIDIO_COURSE,
  presidioAssets,
  severityRank,
  type DemoIssue,
} from "@/data/presidio-demo";
import type { DailyPlan } from "@/lib/daily-plan";
import type {
  ActivityLogEntry,
  GeneratedWorkOrder,
} from "@/lib/generated-work";
import type { WeatherSnapshot } from "@/lib/weather";

export const MORNING_BRIEF_AGENT = "antigravity-preview-05-2026";

const optionalIdSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().min(1).optional(),
);

export const morningBriefWindowValues = [
  "morning",
  "midday",
  "after_first_inspection",
] as const;

export const morningBriefTopPrioritySchema = z.object({
  rank: z.number().int().positive(),
  issueId: z.string().min(1),
  assetId: z.string().min(1),
  workOrderId: optionalIdSchema,
  title: z.string().min(4),
  reason: z.string().min(12),
  recommendedAction: z.string().min(8),
});

export const morningBriefWeatherWatchSchema = z.object({
  summary: z.string().min(12),
  concerns: z.array(z.string().min(6)).min(1).max(4),
});

export const morningBriefCrewPlanItemSchema = z.object({
  sequence: z.number().int().positive(),
  window: z.enum(morningBriefWindowValues),
  crew: z.string().min(3),
  focus: z.string().min(8),
  relatedIssueIds: z.array(z.string().min(1)).default([]),
  relatedWorkOrderIds: z.array(z.string().min(1)).default([]),
  relatedAssetIds: z.array(z.string().min(1)).default([]),
});

export const morningBriefRiskSchema = z.object({
  risk: z.string().min(8),
  verificationStep: z.string().min(8),
  issueId: optionalIdSchema,
  assetId: optionalIdSchema,
  workOrderId: optionalIdSchema,
});

export const morningBriefResponseSchema = z.object({
  openingSummary: z.string().min(20),
  topPriorities: z.array(morningBriefTopPrioritySchema).min(1).max(4),
  weatherWatch: morningBriefWeatherWatchSchema,
  crewPlan: z.array(morningBriefCrewPlanItemSchema).min(1).max(4),
  risksToVerify: z.array(morningBriefRiskSchema).min(1).max(5),
});

export type MorningBriefResponse = z.infer<typeof morningBriefResponseSchema>;
export type MorningBriefTopPriority = z.infer<
  typeof morningBriefTopPrioritySchema
>;
export type MorningBriefCrewPlanItem = z.infer<
  typeof morningBriefCrewPlanItemSchema
>;

export type MorningBriefRankingSource = "daily_plan" | "severity_fallback";

export type MorningBrief = MorningBriefResponse & {
  id: string;
  generatedAt: string;
  source: "Gemini managed agent";
  agentId: string;
  interactionId: string | null;
  environmentId: string | null;
  weather: WeatherSnapshot;
  rankingSource: MorningBriefRankingSource;
};

export type MorningBriefTraceStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed";

export const morningBriefTraceStageIds = [
  "open_work_loaded",
  "weather_context_loaded",
  "managed_agent_payload_prepared",
  "managed_agent_requested",
  "brief_validated",
  "brief_saved",
] as const;

export type MorningBriefTraceStageId =
  (typeof morningBriefTraceStageIds)[number];

export type MorningBriefTraceStep = {
  id: MorningBriefTraceStageId;
  role: string;
  title: string;
  description: string;
  status: MorningBriefTraceStatus;
  detail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
};

export type MorningBriefModelDetails = {
  agentId: string;
  requestedAt: string | null;
  completedAt: string | null;
  requestLatencyMs: number | null;
  validationStatus: "not_started" | "passed" | "failed";
  responseSource: "output_text_json" | "none";
  failureStage: MorningBriefTraceStageId | null;
  failureMessage: string | null;
  interactionId: string | null;
  environmentId: string | null;
  openWorkCount: number;
  workOrderCount: number;
  activityLogCount: number;
  weatherStatus: WeatherSnapshot["status"];
  rankingSource: MorningBriefRankingSource;
  network: "disabled";
  tools: "none";
};

export type MorningBriefRequestIssue = Pick<
  DemoIssue,
  | "id"
  | "assetId"
  | "fieldId"
  | "title"
  | "severity"
  | "status"
  | "openedAt"
  | "priorityScore"
  | "summary"
  | "recommendedAction"
  | "source"
  | "workOrderId"
  | "confidence"
>;

export type MorningBriefRequestWorkOrder = Pick<
  GeneratedWorkOrder,
  | "id"
  | "issueId"
  | "assetId"
  | "fieldId"
  | "title"
  | "priority"
  | "status"
  | "recommendedActions"
  | "possibleParts"
  | "confidence"
  | "createdAt"
  | "updatedAt"
>;

export type MorningBriefPayload = {
  course: typeof PRESIDIO_COURSE;
  preparedAt: string;
  ranking: {
    source: MorningBriefRankingSource;
    items: Array<{
      rank: number;
      issueId: string;
      basis: string;
    }>;
  };
  openWork: Array<{
    issue: MorningBriefRequestIssue;
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
    linkedWorkOrder: MorningBriefRequestWorkOrder | null;
  }>;
  workOrders: MorningBriefRequestWorkOrder[];
  weather: WeatherSnapshot;
  activityLog: ActivityLogEntry[];
};

export type MorningBriefReferenceContext = {
  issues: Array<
    Pick<
      DemoIssue,
      | "id"
      | "assetId"
      | "workOrderId"
      | "title"
      | "summary"
      | "recommendedAction"
    >
  >;
  workOrders: Array<Pick<GeneratedWorkOrder, "id" | "issueId" | "assetId">>;
  assetIds: string[];
};

type TraceUpdate = {
  detail?: string | null;
  at?: string;
  latencyMs?: number | null;
};

const traceDefinitions: Record<
  MorningBriefTraceStageId,
  Pick<MorningBriefTraceStep, "role" | "title" | "description">
> = {
  open_work_loaded: {
    role: "GDM product state",
    title: "Open work loaded",
    description: "Open issues, linked work orders, and activity history are read.",
  },
  weather_context_loaded: {
    role: "Open-Meteo context",
    title: "Weather context loaded",
    description: "Weather context is attached when available and never blocks the brief.",
  },
  managed_agent_payload_prepared: {
    role: "GDM contract",
    title: "Managed-agent payload prepared",
    description: "The supplied-state-only payload is shaped for the hosted agent.",
  },
  managed_agent_requested: {
    role: "Gemini Interactions API",
    title: "Hosted managed agent requested",
    description: "Antigravity runs in a remote sandbox with network egress disabled.",
  },
  brief_validated: {
    role: "GDM contract",
    title: "Brief validated",
    description: "The structured brief is checked against schema and known IDs.",
  },
  brief_saved: {
    role: "Local demo state",
    title: "Latest brief saved",
    description: "The accepted advisory brief replaces the previous local brief.",
  },
};

export const morningBriefResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    openingSummary: { type: "string" },
    topPriorities: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rank: { type: "integer" },
          issueId: { type: "string" },
          assetId: { type: "string" },
          workOrderId: { type: "string" },
          title: { type: "string" },
          reason: { type: "string" },
          recommendedAction: { type: "string" },
        },
        required: [
          "rank",
          "issueId",
          "assetId",
          "title",
          "reason",
          "recommendedAction",
        ],
      },
    },
    weatherWatch: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        concerns: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string" },
        },
      },
      required: ["summary", "concerns"],
    },
    crewPlan: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sequence: { type: "integer" },
          window: {
            type: "string",
            enum: [...morningBriefWindowValues],
          },
          crew: { type: "string" },
          focus: { type: "string" },
          relatedIssueIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          relatedWorkOrderIds: {
            type: "array",
            items: { type: "string" },
          },
          relatedAssetIds: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "sequence",
          "window",
          "crew",
          "focus",
          "relatedIssueIds",
          "relatedWorkOrderIds",
          "relatedAssetIds",
        ],
      },
    },
    risksToVerify: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          risk: { type: "string" },
          verificationStep: { type: "string" },
          issueId: { type: "string" },
          assetId: { type: "string" },
          workOrderId: { type: "string" },
        },
        required: ["risk", "verificationStep"],
      },
    },
  },
  required: [
    "openingSummary",
    "topPriorities",
    "weatherWatch",
    "crewPlan",
    "risksToVerify",
  ],
} as const;

function nowIso() {
  return new Date().toISOString();
}

function assertKnownId(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function crewPlanItems(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).map(([window, action]) => ({
    window,
    action,
  }));
}

function textForIdExtraction(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return "";
}

function extractKnownIds(text: string, allowedIds: Iterable<string>) {
  return [...allowedIds].filter((id) => text.includes(id));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => Boolean(stringValue(item)));
}

function joinedStringValue(value: unknown) {
  if (Array.isArray(value)) {
    const joined = normalizeStringArray(value).join(" ");

    return joined || undefined;
  }

  return stringValue(value);
}

function normalizeWindowValue(value: unknown, index: number) {
  const normalized = stringValue(value)
    ?.toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "morning") {
    return "morning";
  }

  if (normalized === "midday" || normalized === "mid_day") {
    return "midday";
  }

  if (
    normalized === "after_first_inspection" ||
    normalized === "after_inspection" ||
    normalized === "after_first_check"
  ) {
    return "after_first_inspection";
  }

  return morningBriefWindowValues[
    Math.min(index, morningBriefWindowValues.length - 1)
  ];
}

function normalizeMorningBriefCandidate(
  candidate: unknown,
  references: MorningBriefReferenceContext,
) {
  if (!isRecord(candidate)) {
    return candidate;
  }

  const issueById = new Map(
    references.issues.map((issue) => [issue.id, issue] as const),
  );
  const issueIds = references.issues.map((issue) => issue.id);
  const assetIds = references.assetIds;
  const workOrderIds = references.workOrders.map((workOrder) => workOrder.id);
  const topPriorities = arrayValue(candidate.topPriorities).map((item, index) => {
    if (!isRecord(item)) {
      return item;
    }

    const text = textForIdExtraction(item);
    const issueId =
      stringValue(item.issueId) ?? extractKnownIds(text, issueIds)[0];
    const issue = issueId ? issueById.get(issueId) : undefined;
    const assetId =
      stringValue(item.assetId) ??
      (issue?.assetId && text.includes(issue.assetId)
        ? issue.assetId
        : undefined) ??
      extractKnownIds(text, assetIds)[0] ??
      issue?.assetId;
    const workOrderId =
      stringValue(item.workOrderId) ?? extractKnownIds(text, workOrderIds)[0];
    const explicitRecommendedAction =
      stringValue(item.recommendedAction) ??
      joinedStringValue(item.recommendedActions) ??
      stringValue(item.action) ??
      stringValue(item.nextAction) ??
      stringValue(item.nextStep) ??
      stringValue(item.priority) ??
      stringValue(item.task) ??
      joinedStringValue(item.tasks) ??
      stringValue(item.recommendation) ??
      joinedStringValue(item.recommendations) ??
      stringValue(item.summary);
    const recommendedAction =
      explicitRecommendedAction ?? issue?.recommendedAction;

    return {
      ...item,
      rank: numberValue(item.rank) ?? index + 1,
      issueId,
      assetId,
      workOrderId,
      title: stringValue(item.title) ?? issue?.title ?? `Priority ${index + 1}`,
      reason:
        stringValue(item.reason) ??
        stringValue(item.rationale) ??
        stringValue(item.why) ??
        stringValue(item.summary) ??
        explicitRecommendedAction ??
        issue?.summary ??
        recommendedAction,
      recommendedAction,
    };
  });
  const fallbackIssueIds = topPriorities
    .map((item) => (isRecord(item) ? stringValue(item.issueId) : undefined))
    .filter((issueId): issueId is string => Boolean(issueId));
  const fallbackAssetIds = topPriorities
    .map((item) => (isRecord(item) ? stringValue(item.assetId) : undefined))
    .filter((assetId): assetId is string => Boolean(assetId));
  const fallbackWorkOrderIds = topPriorities
    .map((item) => (isRecord(item) ? stringValue(item.workOrderId) : undefined))
    .filter((workOrderId): workOrderId is string => Boolean(workOrderId));

  return {
    ...candidate,
    topPriorities,
    weatherWatch: normalizeWeatherWatch(candidate.weatherWatch),
    crewPlan: crewPlanItems(candidate.crewPlan).map((item, index) =>
      normalizeCrewPlanItem({
        item,
        index,
        issueIds: references.issues.map((issue) => issue.id),
        assetIds,
        workOrderIds,
        fallbackIssueIds,
        fallbackAssetIds,
        fallbackWorkOrderIds,
      }),
    ),
    risksToVerify: arrayValue(candidate.risksToVerify).map((item) =>
      normalizeRiskItem({
        item,
        issueIds: references.issues.map((issue) => issue.id),
        assetIds,
        workOrderIds,
        fallbackIssueIds,
        fallbackAssetIds,
        fallbackWorkOrderIds,
      }),
    ),
  };
}

function normalizeWeatherWatch(value: unknown) {
  if (!isRecord(value)) {
    const summary =
      stringValue(value) ?? "Weather context should be verified in the field.";

    return {
      summary,
      concerns: [summary],
    };
  }

  const concerns = normalizeStringArray(value.concerns);
  const notes = stringValue(value.notes);
  const metricSummary = Object.entries(value)
    .filter(([key]) => !["summary", "concerns"].includes(key))
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join("; ");
  const summary =
    stringValue(value.summary) ??
    notes ??
    (metricSummary ? `Weather context attached: ${metricSummary}` : undefined) ??
    "Weather context is attached for superintendent review.";

  return {
    ...value,
    summary,
    concerns: concerns.length > 0 ? concerns : [notes ?? summary],
  };
}

function normalizeCrewPlanItem({
  item,
  index,
  issueIds,
  assetIds,
  workOrderIds,
  fallbackIssueIds,
  fallbackAssetIds,
  fallbackWorkOrderIds,
}: {
  item: unknown;
  index: number;
  issueIds: string[];
  assetIds: string[];
  workOrderIds: string[];
  fallbackIssueIds: string[];
  fallbackAssetIds: string[];
  fallbackWorkOrderIds: string[];
}) {
  if (!isRecord(item)) {
    return item;
  }

  const text = textForIdExtraction(item);
  const relatedIssueIds = [
    ...new Set([
      ...normalizeStringArray(item.relatedIssueIds),
      ...extractKnownIds(text, issueIds),
    ]),
  ];
  const relatedWorkOrderIds = [
    ...new Set([
      ...normalizeStringArray(item.relatedWorkOrderIds),
      ...extractKnownIds(text, workOrderIds),
    ]),
  ];
  const relatedAssetIds = [
    ...new Set([
      ...normalizeStringArray(item.relatedAssetIds),
      ...extractKnownIds(text, assetIds),
    ]),
  ];

  return {
    ...item,
    sequence: numberValue(item.sequence) ?? index + 1,
    window: normalizeWindowValue(item.window, index),
    crew: stringValue(item.crew) ?? stringValue(item.role),
    focus:
      stringValue(item.focus) ??
      stringValue(item.activity) ??
      stringValue(item.action) ??
      stringValue(item.task) ??
      joinedStringValue(item.tasks) ??
      stringValue(item.summary),
    relatedIssueIds:
      relatedIssueIds.length > 0 ? relatedIssueIds : fallbackIssueIds,
    relatedWorkOrderIds:
      relatedWorkOrderIds.length > 0
        ? relatedWorkOrderIds
        : fallbackWorkOrderIds,
    relatedAssetIds:
      relatedAssetIds.length > 0 ? relatedAssetIds : fallbackAssetIds,
  };
}

function normalizeRiskItem({
  item,
  issueIds,
  assetIds,
  workOrderIds,
  fallbackIssueIds,
  fallbackAssetIds,
  fallbackWorkOrderIds,
}: {
  item: unknown;
  issueIds: string[];
  assetIds: string[];
  workOrderIds: string[];
  fallbackIssueIds: string[];
  fallbackAssetIds: string[];
  fallbackWorkOrderIds: string[];
}) {
  const record = isRecord(item) ? item : { risk: item };
  const text = textForIdExtraction(item);

  return {
    ...record,
    risk:
      stringValue(record.risk) ??
      stringValue(record.summary) ??
      stringValue(item),
    verificationStep:
      stringValue(record.verificationStep) ??
      stringValue(record.verify) ??
      "Verify this condition in the field before acting on the brief.",
    issueId:
      stringValue(record.issueId) ??
      extractKnownIds(text, issueIds)[0] ??
      fallbackIssueIds[0],
    assetId:
      stringValue(record.assetId) ??
      extractKnownIds(text, assetIds)[0] ??
      fallbackAssetIds[0],
    workOrderId:
      stringValue(record.workOrderId) ??
      extractKnownIds(text, workOrderIds)[0] ??
      fallbackWorkOrderIds[0],
  };
}

function fallbackRankIssues(issues: MorningBriefRequestIssue[]) {
  const originalIndex = new Map(issues.map((issue, index) => [issue.id, index]));

  return [...issues].sort((left, right) => {
    const severityDelta =
      severityRank[right.severity] - severityRank[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
}

export function formatMorningBriefWindow(
  window: (typeof morningBriefWindowValues)[number],
) {
  return window.replaceAll("_", " ");
}

export function createEmptyMorningBriefTrace(): MorningBriefTraceStep[] {
  return morningBriefTraceStageIds.map((id) => ({
    id,
    ...traceDefinitions[id],
    status: "pending",
    detail: null,
    startedAt: null,
    completedAt: null,
    latencyMs: null,
  }));
}

export function setMorningBriefTraceStepStatus(
  trace: MorningBriefTraceStep[],
  id: MorningBriefTraceStageId,
  status: MorningBriefTraceStatus,
  update: TraceUpdate = {},
): MorningBriefTraceStep[] {
  const at = update.at ?? nowIso();

  return trace.map((step) => {
    if (step.id !== id) {
      return step;
    }

    return {
      ...step,
      status,
      detail: update.detail ?? step.detail,
      startedAt:
        status === "running" || status === "complete" || status === "failed"
          ? step.startedAt ?? at
          : step.startedAt,
      completedAt:
        status === "complete" || status === "failed" ? at : step.completedAt,
      latencyMs: update.latencyMs ?? step.latencyMs,
    };
  });
}

export function createMorningBriefStartedTrace({
  openWorkCount,
  workOrderCount,
  activityLogCount,
  at = nowIso(),
}: {
  openWorkCount: number;
  workOrderCount: number;
  activityLogCount: number;
  at?: string;
}) {
  return setMorningBriefTraceStepStatus(
    createEmptyMorningBriefTrace(),
    "open_work_loaded",
    "running",
    {
      at,
      detail: `Preparing ${openWorkCount} open issues, ${workOrderCount} work orders, and ${activityLogCount} activity events.`,
    },
  );
}

export function markMorningBriefTraceFailed(
  trace: MorningBriefTraceStep[],
  id: MorningBriefTraceStageId,
  detail: string,
  at = nowIso(),
  latencyMs?: number,
) {
  return setMorningBriefTraceStepStatus(trace, id, "failed", {
    at,
    detail,
    latencyMs,
  });
}

export function appendClientMorningBriefTrace({
  trace,
  at = nowIso(),
}: {
  trace: MorningBriefTraceStep[];
  at?: string;
}) {
  return setMorningBriefTraceStepStatus(
    trace.length > 0 ? trace : createEmptyMorningBriefTrace(),
    "brief_saved",
    "complete",
    {
      at,
      detail: "Latest Morning Superintendent Brief persisted locally.",
    },
  );
}

export function buildMorningBriefPayload({
  issues,
  workOrders,
  activityLog,
  dailyPlan,
  weather,
  preparedAt = nowIso(),
}: {
  issues: MorningBriefRequestIssue[];
  workOrders: MorningBriefRequestWorkOrder[];
  activityLog: ActivityLogEntry[];
  dailyPlan: Pick<DailyPlan, "items"> | null;
  weather: WeatherSnapshot;
  preparedAt?: string;
}): MorningBriefPayload {
  const openIssues = issues.filter((issue) => issue.status !== "resolved");
  const originalIndex = new Map(
    openIssues.map((issue, index) => [issue.id, index] as const),
  );
  const dailyRanks = new Map(
    (dailyPlan?.items ?? []).map((item) => [item.issueId, item.rank] as const),
  );
  const rankingSource: MorningBriefRankingSource =
    dailyRanks.size > 0 ? "daily_plan" : "severity_fallback";
  const rankedIssues =
    rankingSource === "daily_plan"
      ? [...openIssues].sort((left, right) => {
          const leftRank = dailyRanks.get(left.id) ?? Number.POSITIVE_INFINITY;
          const rightRank = dailyRanks.get(right.id) ?? Number.POSITIVE_INFINITY;

          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          const severityDelta =
            severityRank[right.severity] - severityRank[left.severity];

          if (severityDelta !== 0) {
            return severityDelta;
          }

          return (
            (originalIndex.get(left.id) ?? 0) -
            (originalIndex.get(right.id) ?? 0)
          );
        })
      : fallbackRankIssues(openIssues);
  const workOrderByIssueId = new Map(
    workOrders.map((workOrder) => [workOrder.issueId, workOrder] as const),
  );

  return {
    course: PRESIDIO_COURSE,
    preparedAt,
    ranking: {
      source: rankingSource,
      items: rankedIssues.map((issue, index) => ({
        rank:
          rankingSource === "daily_plan"
            ? (dailyRanks.get(issue.id) ?? index + 1)
            : index + 1,
        issueId: issue.id,
        basis:
          rankingSource === "daily_plan"
            ? "Latest Prioritize output"
            : `${issue.severity} severity fallback`,
      })),
    },
    openWork: rankedIssues.map((issue) => {
      const asset = presidioAssets.find(
        (candidate) => candidate.id === issue.assetId,
      );

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
        linkedWorkOrder: workOrderByIssueId.get(issue.id) ?? null,
      };
    }),
    workOrders,
    weather,
    activityLog: activityLog.slice(-12),
  };
}

export function validateMorningBriefResponse(
  candidate: unknown,
  references: MorningBriefReferenceContext,
) {
  const parsed = morningBriefResponseSchema.parse(
    normalizeMorningBriefCandidate(candidate, references),
  );
  const issueById = new Map(
    references.issues.map((issue) => [issue.id, issue] as const),
  );
  const workOrderById = new Map(
    references.workOrders.map((workOrder) => [workOrder.id, workOrder] as const),
  );
  const assetIds = new Set(references.assetIds);
  const seenIssueIds = new Set<string>();
  const seenRanks = new Set<number>();

  for (const priority of parsed.topPriorities) {
    const issue = issueById.get(priority.issueId);

    assertKnownId(
      Boolean(issue),
      `Morning brief referenced unknown issue ${priority.issueId}.`,
    );
    assertKnownId(
      assetIds.has(priority.assetId),
      `Morning brief referenced unknown asset ${priority.assetId}.`,
    );
    assertKnownId(
      issue?.assetId === priority.assetId,
      `Morning brief linked ${priority.issueId} to asset ${priority.assetId}, but that issue belongs to ${issue?.assetId}.`,
    );

    if (priority.workOrderId) {
      const workOrder = workOrderById.get(priority.workOrderId);

      assertKnownId(
        Boolean(workOrder),
        `Morning brief referenced unknown work order ${priority.workOrderId}.`,
      );
      assertKnownId(
        workOrder?.issueId === priority.issueId,
        `Morning brief linked ${priority.workOrderId} to issue ${priority.issueId}, but that work order belongs to ${workOrder?.issueId}.`,
      );
    }

    if (seenIssueIds.has(priority.issueId)) {
      throw new Error(`Morning brief repeated issue ${priority.issueId}.`);
    }

    if (seenRanks.has(priority.rank)) {
      throw new Error(`Morning brief repeated rank ${priority.rank}.`);
    }

    seenIssueIds.add(priority.issueId);
    seenRanks.add(priority.rank);
  }

  for (const crewPlan of parsed.crewPlan) {
    if (
      crewPlan.relatedIssueIds.length === 0 &&
      crewPlan.relatedWorkOrderIds.length === 0 &&
      crewPlan.relatedAssetIds.length === 0
    ) {
      throw new Error("Morning brief crew plan did not cite a known record.");
    }

    for (const issueId of crewPlan.relatedIssueIds) {
      assertKnownId(
        issueById.has(issueId),
        `Morning brief crew plan referenced unknown issue ${issueId}.`,
      );
    }

    for (const workOrderId of crewPlan.relatedWorkOrderIds) {
      assertKnownId(
        workOrderById.has(workOrderId),
        `Morning brief crew plan referenced unknown work order ${workOrderId}.`,
      );
    }

    for (const assetId of crewPlan.relatedAssetIds) {
      assertKnownId(
        assetIds.has(assetId),
        `Morning brief crew plan referenced unknown asset ${assetId}.`,
      );
    }
  }

  for (const risk of parsed.risksToVerify) {
    if (!risk.issueId && !risk.assetId && !risk.workOrderId) {
      throw new Error("Morning brief risk did not cite a known record.");
    }

    if (risk.issueId) {
      assertKnownId(
        issueById.has(risk.issueId),
        `Morning brief risk referenced unknown issue ${risk.issueId}.`,
      );
    }

    if (risk.assetId) {
      assertKnownId(
        assetIds.has(risk.assetId),
        `Morning brief risk referenced unknown asset ${risk.assetId}.`,
      );
    }

    if (risk.workOrderId) {
      assertKnownId(
        workOrderById.has(risk.workOrderId),
        `Morning brief risk referenced unknown work order ${risk.workOrderId}.`,
      );
    }
  }

  return {
    ...parsed,
    topPriorities: [...parsed.topPriorities].sort(
      (left, right) => left.rank - right.rank,
    ),
    crewPlan: [...parsed.crewPlan].sort(
      (left, right) => left.sequence - right.sequence,
    ),
  };
}
