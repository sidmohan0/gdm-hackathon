import { z } from "zod";

import type { DemoIssue } from "@/data/presidio-demo";
import type { GeneratedWorkOrder } from "@/lib/generated-work";
import type { WeatherSnapshot } from "@/lib/weather";

export const PRIORITIZATION_MODEL = "gemini-3.5-flash";

export const dailyPlanDifficultyValues = ["low", "medium", "high"] as const;

export const dailyPlanItemSchema = z.object({
  rank: z.number().int().positive(),
  issueId: z.string().min(1),
  reason: z.string().min(8),
  recommendedCrew: z.string().min(3),
  estimatedDifficulty: z.enum(dailyPlanDifficultyValues),
  summary: z.string().min(8),
});

export const dailyPlanResponseSchema = z.object({
  summary: z.string().min(12),
  items: z.array(dailyPlanItemSchema).min(1),
});

export type DailyPlanResponse = z.infer<typeof dailyPlanResponseSchema>;
export type DailyPlanItem = z.infer<typeof dailyPlanItemSchema>;

export type DailyPlan = DailyPlanResponse & {
  id: string;
  generatedAt: string;
  source: "Gemini";
  modelId: string;
  weather: WeatherSnapshot;
};

export type PrioritizationTraceStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed";

export const prioritizationTraceStageIds = [
  "open_work_loaded",
  "weather_context_loaded",
  "gemini_prioritization_requested",
  "daily_plan_validated",
  "issue_order_applied",
  "top_issue_highlighted",
] as const;

export type PrioritizationTraceStageId =
  (typeof prioritizationTraceStageIds)[number];

export type PrioritizationTraceStep = {
  id: PrioritizationTraceStageId;
  role: string;
  title: string;
  description: string;
  status: PrioritizationTraceStatus;
  detail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
};

export type PrioritizationModelDetails = {
  modelId: string;
  requestedAt: string | null;
  completedAt: string | null;
  requestLatencyMs: number | null;
  validationStatus: "not_started" | "passed" | "failed";
  responseSource: "function_call" | "text_json" | "none";
  failureStage: PrioritizationTraceStageId | null;
  failureMessage: string | null;
  openWorkCount: number;
  workOrderCount: number;
  weatherStatus: WeatherSnapshot["status"];
};

export type PrioritizationRequestIssue = Pick<
  DemoIssue,
  | "id"
  | "assetId"
  | "fieldId"
  | "title"
  | "severity"
  | "status"
  | "priorityScore"
  | "summary"
  | "recommendedAction"
  | "source"
  | "workOrderId"
  | "confidence"
>;

export type PrioritizationRequestWorkOrder = Pick<
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
>;

type TraceUpdate = {
  detail?: string | null;
  at?: string;
  latencyMs?: number | null;
};

const prioritizationTraceDefinitions: Record<
  PrioritizationTraceStageId,
  Pick<PrioritizationTraceStep, "role" | "title" | "description">
> = {
  open_work_loaded: {
    role: "Prioritization Planner",
    title: "Open work loaded",
    description: "Existing open issues and linked work orders are assembled.",
  },
  weather_context_loaded: {
    role: "Weather Context Agent",
    title: "Weather context loaded",
    description: "Open-Meteo context is attached when available.",
  },
  gemini_prioritization_requested: {
    role: "Prioritization Planner",
    title: "Gemini prioritization requested",
    description: "Gemini is called with work, weather, and BMP criteria.",
  },
  daily_plan_validated: {
    role: "Prioritization Planner",
    title: "Daily plan validated",
    description: "The ranked plan is checked before UI ordering changes.",
  },
  issue_order_applied: {
    role: "GIS Context Agent",
    title: "Issue order applied",
    description: "The issue list is reordered by returned rank.",
  },
  top_issue_highlighted: {
    role: "GIS Context Agent",
    title: "Top issue highlighted",
    description: "The highest-ranked existing issue is highlighted on the map.",
  },
};

function nowIso() {
  return new Date().toISOString();
}

export function createEmptyPrioritizationTrace(): PrioritizationTraceStep[] {
  return prioritizationTraceStageIds.map((id) => ({
    id,
    ...prioritizationTraceDefinitions[id],
    status: "pending",
    detail: null,
    startedAt: null,
    completedAt: null,
    latencyMs: null,
  }));
}

export function setPrioritizationTraceStepStatus(
  trace: PrioritizationTraceStep[],
  id: PrioritizationTraceStageId,
  status: PrioritizationTraceStatus,
  update: TraceUpdate = {},
): PrioritizationTraceStep[] {
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

export function createPrioritizationStartedTrace({
  openWorkCount,
  workOrderCount,
  at = nowIso(),
}: {
  openWorkCount: number;
  workOrderCount: number;
  at?: string;
}) {
  return setPrioritizationTraceStepStatus(
    createEmptyPrioritizationTrace(),
    "open_work_loaded",
    "running",
    {
      at,
      detail: `Submitting ${openWorkCount} existing work items and ${workOrderCount} linked work orders.`,
    },
  );
}

export function markPrioritizationTraceFailed(
  trace: PrioritizationTraceStep[],
  id: PrioritizationTraceStageId,
  detail: string,
  at = nowIso(),
  latencyMs?: number,
) {
  return setPrioritizationTraceStepStatus(trace, id, "failed", {
    at,
    detail,
    latencyMs,
  });
}

export function appendClientPrioritizationTrace({
  trace,
  topIssueId,
  rankedCount,
  at = nowIso(),
}: {
  trace: PrioritizationTraceStep[];
  topIssueId: string;
  rankedCount: number;
  at?: string;
}) {
  let nextTrace = trace.length > 0 ? trace : createEmptyPrioritizationTrace();

  nextTrace = setPrioritizationTraceStepStatus(
    nextTrace,
    "issue_order_applied",
    "complete",
    {
      at,
      detail: `${rankedCount} existing work items reordered by Gemini rank.`,
    },
  );
  nextTrace = setPrioritizationTraceStepStatus(
    nextTrace,
    "top_issue_highlighted",
    "complete",
    {
      at,
      detail: `${topIssueId} is highlighted as today's first stop.`,
    },
  );

  return nextTrace;
}

export function validateDailyPlanResponse(
  candidate: unknown,
  allowedIssueIds: string[],
) {
  const parsed = dailyPlanResponseSchema.parse(candidate);
  const allowed = new Set(allowedIssueIds);
  const seenIssueIds = new Set<string>();
  const seenRanks = new Set<number>();

  for (const item of parsed.items) {
    if (!allowed.has(item.issueId)) {
      throw new Error(`Daily plan referenced unknown issue ${item.issueId}.`);
    }

    if (seenIssueIds.has(item.issueId)) {
      throw new Error(`Daily plan repeated issue ${item.issueId}.`);
    }

    if (seenRanks.has(item.rank)) {
      throw new Error(`Daily plan repeated rank ${item.rank}.`);
    }

    seenIssueIds.add(item.issueId);
    seenRanks.add(item.rank);
  }

  return {
    ...parsed,
    items: [...parsed.items].sort((left, right) => left.rank - right.rank),
  };
}

export function orderIssuesByDailyPlan(
  issues: DemoIssue[],
  dailyPlan: DailyPlan | null,
) {
  if (!dailyPlan) {
    return issues;
  }

  const originalIndex = new Map(
    issues.map((issue, index) => [issue.id, index] as const),
  );
  const rankByIssueId = new Map(
    dailyPlan.items.map((item) => [item.issueId, item.rank] as const),
  );

  return [...issues].sort((left, right) => {
    const leftRank = rankByIssueId.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightRank = rankByIssueId.get(right.id) ?? Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
}
