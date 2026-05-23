"use client";

import Image from "next/image";
import { Gauge, MapPin, Wrench } from "lucide-react";

import type { DemoIssue } from "@/data/presidio-demo";
import { buildAssetOperationsContext } from "@/lib/gis-context";
import { assetColors, severityColors } from "@/lib/map-style";

type AssetDetailDrawerProps = {
  selectedAssetId: string | null;
  issues: DemoIssue[];
  attachedPhotoAssetId: string | null;
  attachedPhotoPath: string | null;
};

export function AssetDetailDrawer({
  selectedAssetId,
  issues,
  attachedPhotoAssetId,
  attachedPhotoPath,
}: AssetDetailDrawerProps) {
  const context = selectedAssetId
    ? buildAssetOperationsContext(selectedAssetId, issues)
    : null;
  const asset = context?.asset;
  const attachedToSelected =
    asset?.id === attachedPhotoAssetId && attachedPhotoPath !== null;

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

      {attachedToSelected ? (
        <div className="mt-5 overflow-hidden border border-slate-800 bg-slate-900">
          <Image
            src={attachedPhotoPath}
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
