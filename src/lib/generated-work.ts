import type {
  DemoAsset,
  DemoIssue,
  IssueSeverity,
  LngLat,
} from "@/data/presidio-demo";
import type { TriageResult } from "@/lib/triage";

export type GeneratedObservation = {
  id: string;
  assetId: string;
  fieldId: string;
  photoName: string;
  note: string;
  summary: string;
  evidence: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedWorkOrder = {
  id: string;
  issueId: string;
  assetId: string;
  fieldId: string;
  title: string;
  priority: TriageResult["workOrderPriority"];
  status: "draft" | "ready";
  recommendedActions: string[];
  possibleParts: string[];
  evidence: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLogEntry = {
  id: string;
  assetId: string;
  workOrderId: string;
  event: "created" | "replaced";
  message: string;
  createdAt: string;
};

export type GeneratedArtifacts = {
  observation: GeneratedObservation;
  issue: DemoIssue;
  workOrder: GeneratedWorkOrder;
  activityLogEntry: ActivityLogEntry;
};

function severityToIssueSeverity(
  severity: TriageResult["severity"],
): IssueSeverity {
  if (severity === "urgent") {
    return "critical";
  }

  return severity;
}

function issuePriorityScore(result: TriageResult) {
  const severityBase = {
    urgent: 95,
    high: 82,
    medium: 58,
    low: 32,
  }[result.severity];

  return Math.min(99, Math.round(severityBase + result.confidence * 5));
}

export function generatedIdsForAsset(asset: DemoAsset) {
  const suffix = asset.fieldId.toUpperCase();

  return {
    observationId: `GDM-OBS-${suffix}`,
    issueId: `GDM-ISS-${suffix}`,
    workOrderId: `GDM-WO-${suffix}`,
  };
}

export function buildGeneratedArtifacts({
  asset,
  triage,
  clickedCoordinates,
  photoName,
  note,
  logSequence,
  replacesExisting,
  now = new Date().toISOString(),
}: {
  asset: DemoAsset;
  triage: TriageResult;
  clickedCoordinates: LngLat;
  photoName: string;
  note: string;
  logSequence: number;
  replacesExisting: boolean;
  now?: string;
}): GeneratedArtifacts {
  const ids = generatedIdsForAsset(asset);
  const issueSeverity = severityToIssueSeverity(triage.severity);
  const event = replacesExisting ? "replaced" : "created";

  return {
    observation: {
      id: ids.observationId,
      assetId: asset.id,
      fieldId: asset.fieldId,
      photoName,
      note,
      summary: triage.summary,
      evidence: triage.evidence,
      confidence: triage.confidence,
      createdAt: now,
      updatedAt: now,
    },
    issue: {
      id: ids.issueId,
      assetId: asset.id,
      fieldId: asset.fieldId,
      title: triage.title,
      severity: issueSeverity,
      status: "open",
      coordinates: clickedCoordinates,
      openedAt: now,
      priorityScore: issuePriorityScore(triage),
      summary: triage.summary,
      recommendedAction: triage.recommendedActions.join(" "),
      source: "generated",
      observationId: ids.observationId,
      workOrderId: ids.workOrderId,
      confidence: triage.confidence,
      evidence: triage.evidence,
    },
    workOrder: {
      id: ids.workOrderId,
      issueId: ids.issueId,
      assetId: asset.id,
      fieldId: asset.fieldId,
      title: triage.workOrderTitle,
      priority: triage.workOrderPriority,
      status: "draft",
      recommendedActions: triage.recommendedActions,
      possibleParts: triage.possibleParts,
      evidence: triage.evidence,
      confidence: triage.confidence,
      createdAt: now,
      updatedAt: now,
    },
    activityLogEntry: {
      id: `GDM-LOG-${asset.fieldId.toUpperCase()}-${logSequence}`,
      assetId: asset.id,
      workOrderId: ids.workOrderId,
      event,
      message:
        event === "created"
          ? `Created generated issue and work order for ${asset.fieldId}.`
          : `Replaced generated issue and work order for ${asset.fieldId}.`,
      createdAt: now,
    },
  };
}
