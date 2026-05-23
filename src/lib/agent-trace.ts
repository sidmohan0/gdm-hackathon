export type AgentTraceStatus = "pending" | "running" | "complete" | "failed";

export const agentTraceStageIds = [
  "image_received",
  "gis_context_built",
  "gemini_requested",
  "structured_output_validated",
  "priority_assigned",
  "issue_created",
  "work_order_created",
] as const;

export type AgentTraceStageId = (typeof agentTraceStageIds)[number];

export type AgentTraceStep = {
  id: AgentTraceStageId;
  role: string;
  title: string;
  description: string;
  status: AgentTraceStatus;
  detail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
};

export type ModelValidationStatus = "not_started" | "passed" | "failed";
export type ModelResponseSource = "function_call" | "text_json" | "none";

export type AnalysisModelDetails = {
  modelId: string;
  requestedAt: string | null;
  completedAt: string | null;
  requestLatencyMs: number | null;
  validationStatus: ModelValidationStatus;
  responseSource: ModelResponseSource;
  failureStage: AgentTraceStageId | null;
  failureMessage: string | null;
  selectedAssetFieldId: string | null;
  nearbyAssetCount: number | null;
  openIssueContextCount: number | null;
  photoMimeType: string | null;
};

type TraceUpdate = {
  detail?: string | null;
  at?: string;
  latencyMs?: number | null;
};

const traceDefinitions: Record<
  AgentTraceStageId,
  Pick<AgentTraceStep, "role" | "title" | "description">
> = {
  image_received: {
    role: "Vision Inspector",
    title: "Image received",
    description: "Photo bytes are accepted for the selected asset.",
  },
  gis_context_built: {
    role: "GIS Context Agent",
    title: "GIS context built",
    description: "Selected asset, nearby assets, and open issues are assembled.",
  },
  gemini_requested: {
    role: "Work Order Planner",
    title: "Gemini requested",
    description: "Gemini is called with image and GIS context.",
  },
  structured_output_validated: {
    role: "Work Order Planner",
    title: "Structured output validated",
    description: "The triage contract is checked before local state changes.",
  },
  priority_assigned: {
    role: "Prioritization Planner",
    title: "Priority assigned",
    description: "Severity and confidence are mapped to demo priority.",
  },
  issue_created: {
    role: "Work Order Planner",
    title: "Issue created",
    description: "A generated issue is committed to local demo state.",
  },
  work_order_created: {
    role: "Work Order Planner",
    title: "Work order created",
    description: "A draft work order is committed to local demo state.",
  },
};

function nowIso() {
  return new Date().toISOString();
}

export function createEmptyAgentTrace(): AgentTraceStep[] {
  return agentTraceStageIds.map((id) => ({
    id,
    ...traceDefinitions[id],
    status: "pending",
    detail: null,
    startedAt: null,
    completedAt: null,
    latencyMs: null,
  }));
}

export function setTraceStepStatus(
  trace: AgentTraceStep[],
  id: AgentTraceStageId,
  status: AgentTraceStatus,
  update: TraceUpdate = {},
): AgentTraceStep[] {
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

export function createPhotoReceivedTrace({
  photoName,
  mimeType,
  at = nowIso(),
}: {
  photoName: string;
  mimeType?: string;
  at?: string;
}) {
  const mimeCopy = mimeType ? ` (${mimeType})` : "";

  return setTraceStepStatus(
    createEmptyAgentTrace(),
    "image_received",
    "complete",
    {
      at,
      detail: `${photoName}${mimeCopy} is ready for image + GIS analysis.`,
    },
  );
}

export function createAnalysisStartedTrace({
  photoName,
  mimeType,
  at = nowIso(),
}: {
  photoName: string;
  mimeType?: string;
  at?: string;
}) {
  return setTraceStepStatus(
    createPhotoReceivedTrace({ photoName, mimeType, at }),
    "gis_context_built",
    "running",
    {
      at,
      detail: "Submitting the selected asset, nearby issues, and field note.",
    },
  );
}

export function markTraceFailed(
  trace: AgentTraceStep[],
  id: AgentTraceStageId,
  detail: string,
  at = nowIso(),
  latencyMs?: number,
) {
  return setTraceStepStatus(trace, id, "failed", {
    at,
    detail,
    latencyMs,
  });
}

export function appendClientCreationTrace({
  trace,
  issueId,
  workOrderId,
  fieldId,
  priority,
  at = nowIso(),
}: {
  trace: AgentTraceStep[];
  issueId: string;
  workOrderId: string;
  fieldId: string;
  priority: string;
  at?: string;
}) {
  let nextTrace = trace.length > 0 ? trace : createEmptyAgentTrace();

  nextTrace = setTraceStepStatus(nextTrace, "issue_created", "complete", {
    at,
    detail: `${issueId} opened for ${fieldId}.`,
  });
  nextTrace = setTraceStepStatus(nextTrace, "work_order_created", "complete", {
    at,
    detail: `${workOrderId} drafted at ${priority} priority.`,
  });

  return nextTrace;
}
