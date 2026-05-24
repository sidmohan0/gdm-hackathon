"use client";

import { AlertTriangle, Route, Users } from "lucide-react";

import type {
  DailyPlan,
  PrioritizationModelDetails,
  PrioritizationTraceStatus,
  PrioritizationTraceStep,
} from "@/lib/daily-plan";
import { createEmptyPrioritizationTrace } from "@/lib/daily-plan";
import { formatMetric } from "@/lib/weather";

type DailyPlanPanelProps = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  dailyPlan: DailyPlan | null;
  trace: PrioritizationTraceStep[];
  modelDetails: PrioritizationModelDetails | null;
  onIssueSelect: (issueId: string) => void;
};

const statusStyles: Record<PrioritizationTraceStatus, string> = {
  pending: "bg-slate-600",
  running: "bg-amber-300",
  complete: "bg-emerald-400",
  failed: "bg-red-400",
};

const statusLabels: Record<PrioritizationTraceStatus, string> = {
  pending: "Pending",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
};

const sourceLabels: Record<string, string> = {
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

function weatherLabel(dailyPlan: DailyPlan) {
  if (dailyPlan.weather.status === "unavailable") {
    return "Weather unavailable";
  }

  const rain = formatMetric(dailyPlan.weather.precipitationProbability);
  const wind = formatMetric(dailyPlan.weather.windSpeed);
  const et0 = formatMetric(dailyPlan.weather.evapotranspiration, 2);

  return [rain ? `Rain ${rain}` : null, wind ? `Wind ${wind}` : null, et0 ? `ET0 ${et0}` : null]
    .filter(Boolean)
    .join(" / ");
}

export function DailyPlanPanel({
  status,
  error,
  dailyPlan,
  trace,
  modelDetails,
  onIssueSelect,
}: DailyPlanPanelProps) {
  const steps = trace.length > 0 ? trace : createEmptyPrioritizationTrace();

  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Daily plan
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            {status === "running"
              ? "Prioritizing open work"
              : dailyPlan?.summary ??
                (status === "failed"
                  ? "Prioritization failed"
                  : "No daily ranking generated")}
          </h2>
        </div>
        <Route className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      </div>

      {error ? (
        <p
          className="mb-3 border border-red-500 bg-red-950/70 p-3 text-sm text-red-100"
          role="alert"
        >
          <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
          {error}
        </p>
      ) : null}

      {dailyPlan ? (
        <div className="mb-3 space-y-2">
          <p className="text-xs text-slate-500">
            {dailyPlan.source} / {dailyPlan.modelId} /{" "}
            {weatherLabel(dailyPlan) || dailyPlan.weather.status}
          </p>
          {dailyPlan.items.map((item) => (
            <button
              key={item.issueId}
              type="button"
              onClick={() => onIssueSelect(item.issueId)}
              className="grid min-h-[88px] w-full grid-cols-[34px_minmax(0,1fr)] gap-3 border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-slate-500"
            >
              <span className="flex h-8 w-8 items-center justify-center border border-emerald-500 text-sm font-semibold text-emerald-200">
                {item.rank}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-100">
                  {item.summary}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {item.issueId} / {item.estimatedDifficulty} /{" "}
                  {item.recommendedCrew}
                </span>
                <span className="mt-2 block text-xs text-slate-300">
                  {item.reason}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : status === "idle" ? (
        <p className="mb-3 border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
          No daily ranking generated.
        </p>
      ) : null}

      <div className="border border-slate-800 bg-slate-900 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Prioritization trace
          </h3>
          <span className="text-xs capitalize text-slate-500">{status}</span>
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
            Model details
          </summary>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            <dt>Model</dt>
            <dd className="text-slate-200">
              {modelDetails?.modelId ?? "Pending"}
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
            <dt>Source</dt>
            <dd className="text-slate-200">
              {sourceLabels[modelDetails?.responseSource ?? "none"]}
            </dd>
            <dt>Open work</dt>
            <dd className="text-slate-200">
              {modelDetails?.openWorkCount ?? "Pending"}
            </dd>
            <dt>Work orders</dt>
            <dd className="text-slate-200">
              {modelDetails?.workOrderCount ?? "Pending"}
            </dd>
            <dt>Weather</dt>
            <dd className="text-slate-200">
              {modelDetails?.weatherStatus ?? "Pending"}
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
        <Users className="h-3.5 w-3.5" aria-hidden />
        Existing work only
      </p>
    </section>
  );
}
