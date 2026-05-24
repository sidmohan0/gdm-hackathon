"use client";

import type { LayerVisibility } from "@/lib/map-style";

type LayerPanelProps = {
  layers: LayerVisibility;
  onLayerChange: (nextLayers: LayerVisibility) => void;
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
  onLayerChange,
}: LayerPanelProps) {
  return (
    <section className="border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Layers
        </h2>
      </div>

      <div className="space-y-2">
        {layerLabels.map((layer) => (
          <label
            key={layer.key}
            className="flex min-h-10 items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
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
              className="h-4 w-4 accent-[#004225]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
