"use client";

import type {
  AgentTraceStatus,
  AgentTraceStep,
  AnalysisModelDetails,
} from "@/lib/agent-trace";
import { createEmptyAgentTrace } from "@/lib/agent-trace";

type AgentTracePanelProps = {
  trace: AgentTraceStep[];
  modelDetails: AnalysisModelDetails | null;
};

const statusStyles: Record<AgentTraceStatus, string> = {
  pending: "bg-slate-600",
  running: "bg-amber-300",
  complete: "bg-emerald-400",
  failed: "bg-red-400",
};

const statusLabels: Record<AgentTraceStatus, string> = {
  pending: "Pending",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
};

const responseSourceLabels: Record<string, string> = {
  function_call: "Function call",
  text_json: "Text JSON fallback",
  none: "None yet",
};

function formatLatency(latencyMs: number | null) {
  if (latencyMs === null) {
    return "Pending";
  }

  if (latencyMs < 1000) {
    return `${latencyMs} ms`;
  }

  return `${(latencyMs / 1000).toFixed(1)} s`;
}

function formatTime(iso: string | null) {
  if (!iso) {
    return "Pending";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function AgentTracePanel({
  trace,
  modelDetails,
}: AgentTracePanelProps) {
  const steps = trace.length > 0 ? trace : createEmptyAgentTrace();

  return (
    <section className="mt-3 border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          AI workflow trace
        </h4>
        <span className="text-xs text-slate-500">State driven</span>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="grid grid-cols-[14px_minmax(0,1fr)] gap-3 text-sm"
          >
            <span
              className={`mt-1.5 h-2.5 w-2.5 rounded-full ${statusStyles[step.status]}`}
              aria-label={`${step.title} ${statusLabels[step.status]}`}
              title={statusLabels[step.status]}
            />
            <div className="min-w-0 border-b border-slate-800 pb-2 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {step.role}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-100">
                    {step.title}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  {statusLabels[step.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {step.detail ?? step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <details className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
        <summary className="cursor-pointer select-none font-semibold uppercase tracking-[0.14em] text-slate-500">
          Model details
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <dt>Model</dt>
          <dd className="text-slate-200">{modelDetails?.modelId ?? "Pending"}</dd>
          <dt>Latency</dt>
          <dd className="text-slate-200">
            {formatLatency(modelDetails?.requestLatencyMs ?? null)}
          </dd>
          <dt>Validation</dt>
          <dd className="text-slate-200 capitalize">
            {(modelDetails?.validationStatus ?? "not_started").replace("_", " ")}
          </dd>
          <dt>Source</dt>
          <dd className="text-slate-200">
            {responseSourceLabels[modelDetails?.responseSource ?? "none"]}
          </dd>
          <dt>Requested</dt>
          <dd className="text-slate-200">
            {formatTime(modelDetails?.requestedAt ?? null)}
          </dd>
          <dt>Completed</dt>
          <dd className="text-slate-200">
            {formatTime(modelDetails?.completedAt ?? null)}
          </dd>
          <dt>Asset</dt>
          <dd className="text-slate-200">
            {modelDetails?.selectedAssetFieldId ?? "Pending"}
          </dd>
          <dt>Context</dt>
          <dd className="text-slate-200">
            {modelDetails
              ? `${modelDetails.nearbyAssetCount ?? 0} nearby / ${
                  modelDetails.openIssueContextCount ?? 0
                } issue signals`
              : "Pending"}
          </dd>
          {modelDetails?.failureStage ? (
            <>
              <dt>Failure stage</dt>
              <dd className="text-red-200">
                {modelDetails.failureStage.replaceAll("_", " ")}
              </dd>
              <dt>Failure</dt>
              <dd className="text-red-200">{modelDetails.failureMessage}</dd>
            </>
          ) : null}
        </dl>
      </details>
    </section>
  );
}
