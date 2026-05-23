"use client";

import Image from "next/image";
import { Gauge, MapPin, Wrench } from "lucide-react";

import { AgentTracePanel } from "@/components/panels/AgentTracePanel";
import type { DemoIssue } from "@/data/presidio-demo";
import type {
  AgentTraceStep,
  AnalysisModelDetails,
} from "@/lib/agent-trace";
import { buildAssetOperationsContext } from "@/lib/gis-context";
import type {
  ActivityLogEntry,
  GeneratedWorkOrder,
} from "@/lib/generated-work";
import { assetColors, severityColors } from "@/lib/map-style";
import type { TriageResult } from "@/lib/triage";

type AssetDetailDrawerProps = {
  selectedAssetId: string | null;
  issues: DemoIssue[];
  attachedPhoto: {
    assetId: string;
    path: string | null;
    dataUrl: string | null;
    name: string;
    mimeType: string;
  } | null;
  superintendentNote: string;
  analysisStatus: "idle" | "running" | "succeeded" | "failed";
  triageResult: TriageResult | null;
  analysisError: string | null;
  analysisTrace: AgentTraceStep[];
  analysisModelDetails: AnalysisModelDetails | null;
  activeWorkOrder: GeneratedWorkOrder | null;
  activityLog: ActivityLogEntry[];
  onNoteChange: (note: string) => void;
};

export function AssetDetailDrawer({
  selectedAssetId,
  issues,
  attachedPhoto,
  superintendentNote,
  analysisStatus,
  triageResult,
  analysisError,
  analysisTrace,
  analysisModelDetails,
  activeWorkOrder,
  activityLog,
  onNoteChange,
}: AssetDetailDrawerProps) {
  const context = selectedAssetId
    ? buildAssetOperationsContext(selectedAssetId, issues)
    : null;
  const asset = context?.asset;
  const attachedToSelected = asset?.id === attachedPhoto?.assetId;
  const photoSrc = attachedToSelected && attachedPhoto
    ? attachedPhoto.dataUrl ?? attachedPhoto.path
    : null;
  const workOrderForAsset =
    activeWorkOrder?.assetId === asset?.id ? activeWorkOrder : null;
  const workOrderActivity = workOrderForAsset
    ? activityLog.filter((entry) => entry.workOrderId === workOrderForAsset.id)
    : [];

  if (!asset || !context) {
    return (
      <aside className="border border-slate-700 bg-slate-950 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Asset detail
        </h2>
        <div className="mt-8 border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          Select a map asset or list row.
        </div>
      </aside>
    );
  }

  return (
    <aside className="border border-slate-700 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {asset.id}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            {asset.name}
          </h2>
        </div>
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ background: assetColors[asset.type] }}
          aria-hidden
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <div className="border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1 flex items-center gap-2 text-slate-400">
            <MapPin className="h-4 w-4" aria-hidden />
            Hole
          </div>
          <div className="font-semibold text-slate-100">{asset.hole}</div>
        </div>
        <div className="border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1 flex items-center gap-2 text-slate-400">
            <Wrench className="h-4 w-4" aria-hidden />
            Status
          </div>
          <div className="font-semibold capitalize text-slate-100">
            {asset.status}
          </div>
        </div>
      </div>

      <div className="mt-4 border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
        <div className="mb-2 flex items-center gap-2 text-slate-400">
          <Gauge className="h-4 w-4" aria-hidden />
          Telemetry
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {asset.metrics.pressurePsi ? (
            <>
              <dt className="text-slate-500">Pressure</dt>
              <dd>{asset.metrics.pressurePsi} psi</dd>
            </>
          ) : null}
          {asset.metrics.flowGpm ? (
            <>
              <dt className="text-slate-500">Flow</dt>
              <dd>{asset.metrics.flowGpm} gpm</dd>
            </>
          ) : null}
          {asset.metrics.moisturePct ? (
            <>
              <dt className="text-slate-500">Moisture</dt>
              <dd>{asset.metrics.moisturePct}%</dd>
            </>
          ) : null}
          {asset.metrics.voltage ? (
            <>
              <dt className="text-slate-500">Voltage</dt>
              <dd>{asset.metrics.voltage}v</dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="mt-4 text-sm text-slate-300">
        <p>{asset.notes}</p>
      </div>

      <label className="mt-5 block text-sm">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Field note
        </span>
        <textarea
          value={superintendentNote}
          onChange={(event) => onNoteChange(event.currentTarget.value)}
          className="min-h-24 w-full resize-y border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
          placeholder="Standing water near the head after the morning cycle."
        />
      </label>

      {photoSrc ? (
        <div className="mt-5 overflow-hidden border border-slate-800 bg-slate-900">
          <Image
            src={photoSrc}
            alt={`Uploaded field photo for ${asset.name}`}
            width={640}
            height={420}
            className="aspect-[4/3] w-full object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Gemini triage
        </h3>
        {analysisStatus === "running" ? (
          <p
            className="mt-3 border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300"
            aria-live="polite"
          >
            Analysis running.
          </p>
        ) : null}
        {analysisError ? (
          <p
            className="mt-3 border border-red-500 bg-red-950/70 p-3 text-sm text-red-100"
            role="alert"
          >
            {analysisError}
          </p>
        ) : null}
        <AgentTracePanel
          trace={analysisTrace}
          modelDetails={analysisModelDetails}
        />
        {triageResult ? (
          <article className="mt-3 border border-emerald-500/60 bg-slate-900 p-3 text-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h4 className="font-semibold text-slate-100">
                {triageResult.title}
              </h4>
              <span className="shrink-0 border border-slate-700 px-2 py-1 text-xs uppercase tracking-[0.12em] text-emerald-300">
                {triageResult.severity}
              </span>
            </div>
            <p className="text-slate-300">{triageResult.summary}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-400">
              <dt>Likely asset</dt>
              <dd className="text-slate-200">{triageResult.likelyAssetId}</dd>
              <dt>Category</dt>
              <dd className="text-slate-200">{triageResult.category}</dd>
              <dt>Priority</dt>
              <dd className="text-slate-200">
                {triageResult.workOrderPriority}
              </dd>
              <dt>Confidence</dt>
              <dd className="text-slate-200">
                {Math.round(triageResult.confidence * 100)}%
              </dd>
            </dl>
            <div className="mt-3 space-y-2 text-slate-300">
              <p className="font-semibold text-slate-100">
                {triageResult.workOrderTitle}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Evidence
              </p>
              <ul className="list-inside list-disc space-y-1">
                {triageResult.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Recommended actions
              </p>
              <ul className="list-inside list-disc space-y-1">
                {triageResult.recommendedActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {triageResult.possibleParts.length > 0 ? (
                <p className="text-xs text-slate-400">
                  Parts: {triageResult.possibleParts.join(", ")}
                </p>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>

      {workOrderForAsset ? (
        <div className="mt-5 border border-cyan-500/60 bg-slate-900 p-3 text-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Generated work order
              </p>
              <h3 className="mt-1 font-semibold text-slate-100">
                {workOrderForAsset.title}
              </h3>
            </div>
            <span className="border border-slate-700 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              {workOrderForAsset.status}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-400">
            <dt>Priority</dt>
            <dd className="text-slate-200">{workOrderForAsset.priority}</dd>
            <dt>Linked issue</dt>
            <dd className="text-slate-200">{workOrderForAsset.issueId}</dd>
            <dt>Confidence</dt>
            <dd className="text-slate-200">
              {Math.round(workOrderForAsset.confidence * 100)}%
            </dd>
            <dt>Asset</dt>
            <dd className="text-slate-200">{workOrderForAsset.fieldId}</dd>
          </dl>
          <div className="mt-3 space-y-2 text-slate-300">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Actions
            </p>
            <ul className="list-inside list-disc space-y-1">
              {workOrderForAsset.recommendedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {workOrderForAsset.possibleParts.length > 0 ? (
              <p className="text-xs text-slate-400">
                Parts: {workOrderForAsset.possibleParts.join(", ")}
              </p>
            ) : null}
          </div>
          {workOrderActivity.length > 0 ? (
            <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
              {workOrderActivity.slice(-3).map((entry) => (
                <p key={entry.id}>
                  {entry.event}: {entry.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Issue context
        </h3>
        <div className="mt-3 space-y-3">
          {[...context.openIssues, ...context.nearbyIssues].map((issue) => (
            <article
              key={issue.id}
              className="border border-slate-800 bg-slate-900 p-3 text-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h4 className="font-semibold text-slate-100">{issue.title}</h4>
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: severityColors[issue.severity] }}
                  aria-label={`${issue.severity} severity`}
                />
              </div>
              <p className="text-slate-400">{issue.summary}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {issue.id} / {issue.status} / {issue.priorityScore}
              </p>
            </article>
          ))}
          {context.issueCount === 0 ? (
            <p className="border border-slate-800 bg-slate-900 p-3 text-sm text-slate-500">
              No active issue context.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
