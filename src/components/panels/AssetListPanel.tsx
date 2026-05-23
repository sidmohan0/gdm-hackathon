"use client";

import { ListTree } from "lucide-react";

import { presidioAssets, type DemoIssue } from "@/data/presidio-demo";
import { buildAssetOperationsContext } from "@/lib/gis-context";
import { assetColors, severityColors } from "@/lib/map-style";

type AssetListPanelProps = {
  issues: DemoIssue[];
  selectedAssetId: string | null;
  onAssetSelect: (assetId: string) => void;
};

export function AssetListPanel({
  issues,
  selectedAssetId,
  onAssetSelect,
}: AssetListPanelProps) {
  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-4 flex items-center gap-2">
        <ListTree className="h-4 w-4 text-slate-400" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Assets
        </h2>
      </div>

      <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
        {presidioAssets.map((asset) => {
          const context = buildAssetOperationsContext(asset.id, issues);
          const isSelected = asset.id === selectedAssetId;
          const severityColor = context?.issueCount
            ? severityColors[context.highestSeverity]
            : "#64748b";

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => onAssetSelect(asset.id)}
              aria-pressed={isSelected}
              className="grid min-h-[74px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 border border-slate-800 bg-slate-900 px-3 py-3 text-left text-sm transition hover:border-slate-500 aria-pressed:border-emerald-400 aria-pressed:bg-slate-800"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: assetColors[asset.type] }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-100">
                  {asset.name}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-400">
                  {asset.id} / Hole {asset.hole}
                </span>
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: severityColor }}
                aria-label={`${context?.issueCount ?? 0} issue context`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
