"use client";

import { useCallback, useMemo, useState } from "react";

import { CourseMap } from "@/components/map/CourseMap";
import { AssetDetailDrawer } from "@/components/panels/AssetDetailDrawer";
import { AssetListPanel } from "@/components/panels/AssetListPanel";
import { LayerPanel } from "@/components/panels/LayerPanel";
import { ReadinessDot } from "@/components/shell/ReadinessDot";
import { WeatherChip } from "@/components/shell/WeatherChip";
import { PRESIDIO_COURSE, presidioAssets } from "@/data/presidio-demo";
import { useDemoStore } from "@/lib/demo-store";
import {
  createCheckingReadiness,
  type MapboxClientHealth,
} from "@/lib/readiness";
import {
  defaultLayerVisibility,
  type LayerVisibility,
} from "@/lib/map-style";

export function DemoDashboard() {
  const [layers, setLayers] = useState<LayerVisibility>(defaultLayerVisibility);
  const [mapboxHealth, setMapboxHealth] = useState<MapboxClientHealth>(
    createCheckingReadiness("Mapbox loading."),
  );
  const selectedAssetId = useDemoStore((state) => state.selectedAssetId);
  const issues = useDemoStore((state) => state.issues);
  const attachedPhotoAssetId = useDemoStore(
    (state) => state.attachedPhotoAssetId,
  );
  const attachedPhotoPath = useDemoStore((state) => state.attachedPhotoPath);
  const selectAsset = useDemoStore((state) => state.selectAsset);
  const attachDemoPhoto = useDemoStore((state) => state.attachDemoPhoto);
  const resetDemo = useDemoStore((state) => state.resetDemo);

  const activeIssueCount = useMemo(
    () => issues.filter((issue) => issue.status !== "resolved").length,
    [issues],
  );
  const handleMapHealthChange = useCallback((health: MapboxClientHealth) => {
    setMapboxHealth(health);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100">
      <header className="border-b border-slate-800 bg-neutral-950 px-5 py-4">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              GDM
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {PRESIDIO_COURSE.name} GIS Operations
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300">
              {presidioAssets.length} assets
            </span>
            <span className="border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300">
              {activeIssueCount} open issues
            </span>
            <ReadinessDot mapboxHealth={mapboxHealth} />
            <WeatherChip />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1680px] gap-4 px-5 py-5 xl:grid-cols-[310px_minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <LayerPanel
            layers={layers}
            selectedAssetId={selectedAssetId}
            onLayerChange={setLayers}
            onUploadPhoto={attachDemoPhoto}
            onReset={resetDemo}
          />
          <AssetListPanel
            issues={issues}
            selectedAssetId={selectedAssetId}
            onAssetSelect={selectAsset}
          />
        </div>

        <CourseMap
          selectedAssetId={selectedAssetId}
          issues={issues}
          layers={layers}
          onAssetSelect={selectAsset}
          onMapHealthChange={handleMapHealthChange}
        />

        <AssetDetailDrawer
          selectedAssetId={selectedAssetId}
          issues={issues}
          attachedPhotoAssetId={attachedPhotoAssetId}
          attachedPhotoPath={attachedPhotoPath}
        />
      </main>
    </div>
  );
}
