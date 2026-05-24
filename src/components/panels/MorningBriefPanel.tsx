"use client";

import {
  AlertTriangle,
  FileText,
  ShieldCheck,
} from "lucide-react";

import {
  createEmptyMorningBriefTrace,
  formatMorningBriefWindow,
  type MorningBrief,
  type MorningBriefModelDetails,
  type MorningBriefTraceStatus,
  type MorningBriefTraceStep,
} from "@/lib/morning-brief";
import { formatMetric } from "@/lib/weather";

type MorningBriefPanelProps = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  brief: MorningBrief | null;
  trace: MorningBriefTraceStep[];
  modelDetails: MorningBriefModelDetails | null;
  openWorkCount: number;
  onIssueSelect: (issueId: string) => void;
};

const statusStyles: Record<MorningBriefTraceStatus, string> = {
  pending: "bg-slate-600",
  running: "bg-amber-300",
  complete: "bg-emerald-400",
  failed: "bg-red-400",
};

const statusLabels: Record<MorningBriefTraceStatus, string> = {
  pending: "Pending",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
};

const rankingLabels: Record<MorningBrief["rankingSource"], string> = {
  daily_plan: "Prioritize ranking",
  severity_fallback: "Severity fallback",
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

function weatherLabel(brief: MorningBrief) {
  if (brief.weather.status === "unavailable") {
    return "Weather unavailable";
  }

  const rain = formatMetric(brief.weather.precipitationProbability);
  const wind = formatMetric(brief.weather.windSpeed);

  return [rain ? `Rain ${rain}` : null, wind ? `Wind ${wind}` : null]
    .filter(Boolean)
    .join(" / ");
}

export function MorningBriefPanel({
  status,
  error,
  brief,
  trace,
  modelDetails,
  openWorkCount,
  onIssueSelect,
}: MorningBriefPanelProps) {
  const steps = trace.length > 0 ? trace : createEmptyMorningBriefTrace();
  const isRunning = status === "running";

  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Morning brief
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            {isRunning
              ? "Generating superintendent brief"
              : brief
                ? "Latest superintendent brief"
                : "Generate superintendent brief"}
          </h2>
        </div>
        <FileText className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      </div>

      {openWorkCount === 0 && !isRunning ? (
        <p className="mb-3 text-xs text-slate-500">
          No open work is available for the brief.
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-3 border border-red-500 bg-red-950/70 p-3 text-sm text-red-100"
          role="alert"
        >
          <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
          {error}
        </p>
      ) : null}

      {brief ? (
        <div className="mb-3 space-y-3">
          <div className="border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">
              {brief.source} / {brief.agentId} /{" "}
              {rankingLabels[brief.rankingSource]} /{" "}
              {weatherLabel(brief) || brief.weather.status}
            </p>
            <p className="mt-2 text-sm text-slate-100">
              {brief.openingSummary}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Top priorities
            </h3>
            <div className="space-y-2">
              {brief.topPriorities.map((priority) => (
                <button
                  key={`${priority.rank}-${priority.issueId}`}
                  type="button"
                  onClick={() => onIssueSelect(priority.issueId)}
                  className="grid min-h-[92px] w-full grid-cols-[34px_minmax(0,1fr)] gap-3 border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-slate-500"
                >
                  <span className="flex h-8 w-8 items-center justify-center border border-emerald-500 text-sm font-semibold text-emerald-200">
                    {priority.rank}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-100">
                      {priority.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {priority.issueId} / {priority.assetId}
                    </span>
                    <span className="mt-2 block text-xs text-slate-300">
                      {priority.reason}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="border border-slate-800 bg-slate-900 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Weather watch
              </h3>
              <p className="mt-2 text-slate-200">{brief.weatherWatch.summary}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                {brief.weatherWatch.concerns.map((concern) => (
                  <li key={concern}>{concern}</li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-800 bg-slate-900 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Crew plan
              </h3>
              <ol className="mt-2 space-y-2 text-xs text-slate-300">
                {brief.crewPlan.map((item) => (
                  <li key={`${item.sequence}-${item.focus}`}>
                    <span className="font-semibold text-slate-100">
                      {item.sequence}. {formatMorningBriefWindow(item.window)}
                    </span>
                    <span className="block text-slate-400">
                      {item.crew}: {item.focus}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border border-slate-800 bg-slate-900 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Risks to verify
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                {brief.risksToVerify.map((risk) => (
                  <li key={`${risk.risk}-${risk.verificationStep}`}>
                    <span className="font-semibold text-slate-100">
                      {risk.risk}
                    </span>
                    <span className="block text-slate-400">
                      {risk.verificationStep}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border border-slate-800 bg-slate-900 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Managed-agent trace
          </h3>
          <span className="text-xs capitalize text-slate-500">
            {openWorkCount} open
          </span>
        </div>
        <ol className="space-y-2">
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
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {step.role}
                    </span>
                    <span className="mt-0.5 block font-semibold text-slate-100">
                      {step.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {statusLabels[step.status]}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {step.detail ?? step.description}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <details className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
          <summary className="cursor-pointer select-none font-semibold uppercase tracking-[0.14em] text-slate-500">
            Managed-agent details
          </summary>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            <dt>Agent</dt>
            <dd className="text-slate-200">
              {modelDetails?.agentId ?? brief?.agentId ?? "Pending"}
            </dd>
            <dt>Latency</dt>
            <dd className="text-slate-200">
              {formatLatency(modelDetails?.requestLatencyMs ?? null)}
            </dd>
            <dt>Validation</dt>
            <dd className="text-slate-200 capitalize">
              {(modelDetails?.validationStatus ?? "not_started").replace(
                "_",
                " ",
              )}
            </dd>
            <dt>Network</dt>
            <dd className="text-slate-200">
              {modelDetails?.network ?? "disabled"}
            </dd>
            <dt>Tools</dt>
            <dd className="text-slate-200">{modelDetails?.tools ?? "none"}</dd>
            <dt>Interaction</dt>
            <dd className="break-all text-slate-200">
              {modelDetails?.interactionId ?? brief?.interactionId ?? "Pending"}
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
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Advisory only
      </p>
    </section>
  );
}
