"use client";

import { useCallback, useMemo, useState } from "react";

import { CourseMap } from "@/components/map/CourseMap";
import { AssetDetailDrawer } from "@/components/panels/AssetDetailDrawer";
import { AssetListPanel } from "@/components/panels/AssetListPanel";
import { DailyPlanPanel } from "@/components/panels/DailyPlanPanel";
import { IssueWorkListPanel } from "@/components/panels/IssueWorkListPanel";
import { LayerPanel } from "@/components/panels/LayerPanel";
import { MorningBriefPanel } from "@/components/panels/MorningBriefPanel";
import { ReadinessDot } from "@/components/shell/ReadinessDot";
import { WeatherChip } from "@/components/shell/WeatherChip";
import {
  getAssetById,
  PRESIDIO_COURSE,
  presidioAssets,
} from "@/data/presidio-demo";
import type {
  AgentTraceStep,
  AnalysisModelDetails,
} from "@/lib/agent-trace";
import { useDemoStore } from "@/lib/demo-store";
import {
  createCheckingReadiness,
  type MapboxClientHealth,
} from "@/lib/readiness";
import {
  defaultLayerVisibility,
  type LayerVisibility,
} from "@/lib/map-style";
import type { TriageResult } from "@/lib/triage";
import {
  orderIssuesByDailyPlan,
  type DailyPlan,
  type PrioritizationModelDetails,
  type PrioritizationTraceStep,
} from "@/lib/daily-plan";
import type {
  MorningBrief,
  MorningBriefModelDetails,
  MorningBriefTraceStep,
} from "@/lib/morning-brief";

type AnalyzePhotoPayload = {
  result?: TriageResult;
  trace?: AgentTraceStep[];
  modelDetails?: AnalysisModelDetails | null;
  error?: string;
};

type PrioritizePayload = {
  dailyPlan?: DailyPlan;
  trace?: PrioritizationTraceStep[];
  modelDetails?: PrioritizationModelDetails | null;
  error?: string;
};

type MorningBriefPayload = {
  brief?: MorningBrief;
  trace?: MorningBriefTraceStep[];
  modelDetails?: MorningBriefModelDetails | null;
  error?: string;
};

export function DemoDashboard() {
  const [layers, setLayers] = useState<LayerVisibility>(defaultLayerVisibility);
  const [mapboxHealth, setMapboxHealth] = useState<MapboxClientHealth>(
    createCheckingReadiness("Mapbox loading."),
  );
  const selectedAssetId = useDemoStore((state) => state.selectedAssetId);
  const issues = useDemoStore((state) => state.issues);
  const attachedPhoto = useDemoStore((state) => state.attachedPhoto);
  const superintendentNote = useDemoStore((state) => state.superintendentNote);
  const analysisStatus = useDemoStore((state) => state.analysisStatus);
  const triageResult = useDemoStore((state) => state.triageResult);
  const analysisError = useDemoStore((state) => state.analysisError);
  const analysisTrace = useDemoStore((state) => state.analysisTrace);
  const analysisModelDetails = useDemoStore(
    (state) => state.analysisModelDetails,
  );
  const prioritizationStatus = useDemoStore(
    (state) => state.prioritizationStatus,
  );
  const prioritizationError = useDemoStore(
    (state) => state.prioritizationError,
  );
  const dailyPlan = useDemoStore((state) => state.dailyPlan);
  const prioritizationTrace = useDemoStore(
    (state) => state.prioritizationTrace,
  );
  const prioritizationModelDetails = useDemoStore(
    (state) => state.prioritizationModelDetails,
  );
  const morningBriefStatus = useDemoStore(
    (state) => state.morningBriefStatus,
  );
  const morningBriefError = useDemoStore((state) => state.morningBriefError);
  const morningBrief = useDemoStore((state) => state.morningBrief);
  const morningBriefTrace = useDemoStore((state) => state.morningBriefTrace);
  const morningBriefModelDetails = useDemoStore(
    (state) => state.morningBriefModelDetails,
  );
  const highlightedIssueId = useDemoStore((state) => state.highlightedIssueId);
  const generatedWorkOrders = useDemoStore(
    (state) => state.generatedWorkOrders,
  );
  const activityLog = useDemoStore((state) => state.activityLog);
  const activeWorkOrderId = useDemoStore((state) => state.activeWorkOrderId);
  const selectAsset = useDemoStore((state) => state.selectAsset);
  const attachDemoPhoto = useDemoStore((state) => state.attachDemoPhoto);
  const attachUploadedPhoto = useDemoStore((state) => state.attachUploadedPhoto);
  const setSuperintendentNote = useDemoStore(
    (state) => state.setSuperintendentNote,
  );
  const startAnalysis = useDemoStore((state) => state.startAnalysis);
  const completeAnalysis = useDemoStore((state) => state.completeAnalysis);
  const failAnalysis = useDemoStore((state) => state.failAnalysis);
  const startPrioritization = useDemoStore(
    (state) => state.startPrioritization,
  );
  const completePrioritization = useDemoStore(
    (state) => state.completePrioritization,
  );
  const failPrioritization = useDemoStore(
    (state) => state.failPrioritization,
  );
  const startMorningBrief = useDemoStore((state) => state.startMorningBrief);
  const completeMorningBrief = useDemoStore(
    (state) => state.completeMorningBrief,
  );
  const failMorningBrief = useDemoStore((state) => state.failMorningBrief);
  const resetDemo = useDemoStore((state) => state.resetDemo);

  const activeIssueCount = useMemo(
    () => issues.filter((issue) => issue.status !== "resolved").length,
    [issues],
  );
  const orderedIssues = useMemo(
    () => orderIssuesByDailyPlan(issues, dailyPlan),
    [dailyPlan, issues],
  );
  const activeWorkOrder = useMemo(
    () =>
      generatedWorkOrders.find(
        (workOrder) => workOrder.id === activeWorkOrderId,
      ) ?? null,
    [activeWorkOrderId, generatedWorkOrders],
  );
  const handleMapHealthChange = useCallback((health: MapboxClientHealth) => {
    setMapboxHealth(health);
  }, []);
  const hasSelectedPhoto =
    Boolean(selectedAssetId) && attachedPhoto?.assetId === selectedAssetId;
  const isAnalyzing = analysisStatus === "running";
  const isPrioritizing = prioritizationStatus === "running";
  const isGeneratingBrief = morningBriefStatus === "running";
  const canUploadPhoto = Boolean(
    selectedAssetId && !isAnalyzing && !isPrioritizing && !isGeneratingBrief,
  );
  const canAnalyze = Boolean(
    selectedAssetId &&
      hasSelectedPhoto &&
      !isAnalyzing &&
      !isPrioritizing &&
      !isGeneratingBrief,
  );
  const canPrioritize =
    activeIssueCount > 0 &&
    !isAnalyzing &&
    !isPrioritizing &&
    !isGeneratingBrief;
  const canGenerateBrief =
    activeIssueCount > 0 &&
    !isAnalyzing &&
    !isPrioritizing &&
    !isGeneratingBrief;

  const handlePhotoFileSelected = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      attachUploadedPhoto({
        dataUrl,
        name: file.name || "uploaded-photo",
        mimeType: file.type || "image/png",
      });
    },
    [attachUploadedPhoto],
  );

  const handleAnalyze = useCallback(async () => {
    const selectedAsset = selectedAssetId ? getAssetById(selectedAssetId) : null;

    if (
      isAnalyzing ||
      isPrioritizing ||
      isGeneratingBrief ||
      !selectedAsset ||
      !attachedPhoto ||
      attachedPhoto.assetId !== selectedAssetId
    ) {
      return;
    }

    startAnalysis();

    try {
      const photoResponse = await fetch(
        attachedPhoto.dataUrl ?? attachedPhoto.path ?? "",
      );
      const photoBlob = await photoResponse.blob();
      const formData = new FormData();

      formData.append("assetId", selectedAsset.id);
      formData.append("note", superintendentNote);
      formData.append("clickedLongitude", String(selectedAsset.coordinates[0]));
      formData.append("clickedLatitude", String(selectedAsset.coordinates[1]));
      formData.append(
        "photo",
        photoBlob,
        attachedPhoto.name || "field-photo.png",
      );

      const response = await fetch("/api/analyze-photo", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as AnalyzePhotoPayload;

      if (!response.ok) {
        failAnalysis(
          payload.error ?? "Gemini analysis failed.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      if (!payload.result) {
        failAnalysis(
          "Gemini analysis did not return a triage result.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      completeAnalysis(payload.result, payload.trace, payload.modelDetails);
    } catch (error) {
      failAnalysis(
        error instanceof Error ? error.message : "Gemini analysis failed.",
      );
    }
  }, [
    attachedPhoto,
    completeAnalysis,
    failAnalysis,
    isGeneratingBrief,
    isAnalyzing,
    isPrioritizing,
    selectedAssetId,
    startAnalysis,
    superintendentNote,
  ]);

  const handleIssueSelect = useCallback(
    (issueId: string) => {
      const issue = issues.find((candidate) => candidate.id === issueId);

      if (issue) {
        selectAsset(issue.assetId);
      }
    },
    [issues, selectAsset],
  );

  const handlePrioritize = useCallback(async () => {
    if (!canPrioritize) {
      return;
    }

    startPrioritization();

    try {
      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issues,
          workOrders: generatedWorkOrders,
        }),
      });
      const payload = (await response.json()) as PrioritizePayload;

      if (!response.ok) {
        failPrioritization(
          payload.error ?? "Gemini prioritization failed.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      if (!payload.dailyPlan) {
        failPrioritization(
          "Gemini prioritization did not return a daily plan.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      completePrioritization(
        payload.dailyPlan,
        payload.trace,
        payload.modelDetails,
      );

      const topIssue = issues.find(
        (issue) => issue.id === payload.dailyPlan?.items[0]?.issueId,
      );

      if (topIssue) {
        selectAsset(topIssue.assetId);
      }
    } catch (error) {
      failPrioritization(
        error instanceof Error
          ? error.message
          : "Gemini prioritization failed.",
      );
    }
  }, [
    completePrioritization,
    failPrioritization,
    generatedWorkOrders,
    issues,
    canPrioritize,
    selectAsset,
    startPrioritization,
  ]);

  const handleMorningBrief = useCallback(async () => {
    if (!canGenerateBrief) {
      return;
    }

    startMorningBrief();

    try {
      const response = await fetch("/api/morning-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issues,
          workOrders: generatedWorkOrders,
          activityLog,
          dailyPlan,
        }),
      });
      const payload = (await response.json()) as MorningBriefPayload;

      if (!response.ok) {
        failMorningBrief(
          payload.error ?? "Gemini managed-agent brief failed.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      if (!payload.brief) {
        failMorningBrief(
          "Gemini managed agent did not return a Morning Superintendent Brief.",
          payload.trace,
          payload.modelDetails,
        );
        return;
      }

      completeMorningBrief(
        payload.brief,
        payload.trace,
        payload.modelDetails,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? `Managed-agent request failed: ${error.message}.`
          : "Gemini managed-agent brief failed.";

      failMorningBrief(message);
    }
  }, [
    activityLog,
    canGenerateBrief,
    completeMorningBrief,
    dailyPlan,
    failMorningBrief,
    generatedWorkOrders,
    issues,
    startMorningBrief,
  ]);

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

      <main className="mx-auto grid max-w-[1680px] gap-4 px-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <LayerPanel
            layers={layers}
            selectedAssetId={selectedAssetId}
            canUploadPhoto={canUploadPhoto}
            canAnalyze={canAnalyze}
            isAnalyzing={isAnalyzing}
            canPrioritize={canPrioritize}
            isPrioritizing={isPrioritizing}
            onLayerChange={setLayers}
            onUploadPhoto={attachDemoPhoto}
            onPhotoFileSelected={handlePhotoFileSelected}
            onAnalyze={handleAnalyze}
            onPrioritize={handlePrioritize}
            onReset={resetDemo}
          />
          <DailyPlanPanel
            status={prioritizationStatus}
            error={prioritizationError}
            dailyPlan={dailyPlan}
            trace={prioritizationTrace}
            modelDetails={prioritizationModelDetails}
            onIssueSelect={handleIssueSelect}
          />
          <MorningBriefPanel
            status={morningBriefStatus}
            error={morningBriefError}
            brief={morningBrief}
            trace={morningBriefTrace}
            modelDetails={morningBriefModelDetails}
            canGenerate={canGenerateBrief}
            openWorkCount={activeIssueCount}
            onGenerate={handleMorningBrief}
            onIssueSelect={handleIssueSelect}
          />
          <IssueWorkListPanel
            issues={orderedIssues}
            dailyPlan={dailyPlan}
            highlightedIssueId={highlightedIssueId}
            onIssueSelect={handleIssueSelect}
          />
          <AssetListPanel
            issues={issues}
            selectedAssetId={selectedAssetId}
            onAssetSelect={selectAsset}
          />
        </div>

        <CourseMap
          selectedAssetId={selectedAssetId}
          issues={orderedIssues}
          highlightedIssueId={highlightedIssueId}
          layers={layers}
          onAssetSelect={selectAsset}
          onMapHealthChange={handleMapHealthChange}
        />

        <div className="lg:col-span-2 xl:col-span-1">
          <AssetDetailDrawer
            selectedAssetId={selectedAssetId}
            issues={issues}
            attachedPhoto={attachedPhoto}
            superintendentNote={superintendentNote}
            analysisStatus={analysisStatus}
            triageResult={triageResult}
            analysisError={analysisError}
            analysisTrace={analysisTrace}
            analysisModelDetails={analysisModelDetails}
            activeWorkOrder={activeWorkOrder}
            activityLog={activityLog}
            onNoteChange={setSuperintendentNote}
          />
        </div>
      </main>
    </div>
  );
}
