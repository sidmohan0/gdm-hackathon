"use client";

import { Brain, CloudSun, RotateCcw, Upload } from "lucide-react";

import type { LayerVisibility } from "@/lib/map-style";

type LayerPanelProps = {
  layers: LayerVisibility;
  selectedAssetId: string | null;
  onLayerChange: (nextLayers: LayerVisibility) => void;
  onUploadPhoto: () => void;
  onReset: () => void;
};

const layerLabels: Array<{
  key: keyof LayerVisibility;
  label: string;
  colorClass: string;
}> = [
  {
    key: "sprinklers",
    label: "Sprinklers",
    colorClass: "bg-emerald-400",
  },
  {
    key: "pipes",
    label: "Pipes",
    colorClass: "bg-sky-400",
  },
  {
    key: "valves",
    label: "Valves",
    colorClass: "bg-amber-400",
  },
  {
    key: "controllers",
    label: "Controllers",
    colorClass: "bg-violet-400",
  },
  {
    key: "issues",
    label: "Open issues",
    colorClass: "bg-red-400",
  },
];

export function LayerPanel({
  layers,
  selectedAssetId,
  onLayerChange,
  onUploadPhoto,
  onReset,
}: LayerPanelProps) {
  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Layers
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-9 items-center justify-center border border-slate-700 text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          title="Reset"
          aria-label="Reset demo"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-2">
        {layerLabels.map((layer) => (
          <label
            key={layer.key}
            className="flex min-h-10 items-center justify-between gap-3 border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100"
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${layer.colorClass}`}
                aria-hidden
              />
              {layer.label}
            </span>
            <input
              type="checkbox"
              checked={layers[layer.key]}
              onChange={(event) =>
                onLayerChange({
                  ...layers,
                  [layer.key]: event.currentTarget.checked,
                })
              }
              className="h-4 w-4 accent-emerald-400"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={onUploadPhoto}
          disabled={!selectedAssetId}
          className="inline-flex h-11 items-center justify-center gap-2 border border-emerald-500 bg-emerald-500 px-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Upload photo
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-300 transition disabled:cursor-not-allowed disabled:text-slate-600"
        >
          <Brain className="h-4 w-4" aria-hidden />
          Analyze
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-600"
        >
          <CloudSun className="h-4 w-4" aria-hidden />
          Prioritize
        </button>
      </div>
    </section>
  );
}
