"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Brain,
  ClipboardList,
  FileText,
  ImageUp,
  Layers3,
  ListTree,
  LoaderCircle,
  RotateCcw,
  Route,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

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
  type DemoAsset,
} from "@/data/presidio-demo";
import type {
  AgentTraceStep,
  AnalysisModelDetails,
} from "@/lib/agent-trace";
import { useDemoStore } from "@/lib/demo-store";
import type { GeneratedWorkOrder } from "@/lib/generated-work";
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
import {
  getWorkspaceCommandAvailability,
  getWorkspaceRunLabel,
  toggleWorkspaceModule,
  type WorkspaceCommandAvailability,
  type WorkspaceModule,
} from "@/lib/workspace-shell";

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

type WorkspaceModuleConfig = {
  id: WorkspaceModule;
  label: string;
  title: string;
  icon: LucideIcon;
};

const moduleConfigs: WorkspaceModuleConfig[] = [
  {
    id: "map",
    label: "Map",
    title: "Map Layers",
    icon: Layers3,
  },
  {
    id: "assets",
    label: "Assets",
    title: "Assets",
    icon: ListTree,
  },
  {
    id: "work",
    label: "Work",
    title: "Open Work",
    icon: ClipboardList,
  },
  {
    id: "plan",
    label: "Plan",
    title: "Daily Plan",
    icon: Route,
  },
  {
    id: "brief",
    label: "Brief",
    title: "Morning Brief",
    icon: FileText,
  },
];

function getModuleConfig(module: WorkspaceModule) {
  return moduleConfigs.find((config) => config.id === module) ?? moduleConfigs[0];
}

export function DemoDashboard() {
  const [layers, setLayers] = useState<LayerVisibility>(defaultLayerVisibility);
  const [activeModule, setActiveModule] = useState<WorkspaceModule | null>(null);
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
  const selectedAsset = useMemo(
    () => (selectedAssetId ? getAssetById(selectedAssetId) : null),
    [selectedAssetId],
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
  const commandAvailability = useMemo(
    () =>
      getWorkspaceCommandAvailability({
        selectedAssetId,
        hasSelectedPhoto,
        openIssueCount: activeIssueCount,
        isAnalyzing,
        isPrioritizing,
        isGeneratingBrief,
      }),
    [
      activeIssueCount,
      hasSelectedPhoto,
      isAnalyzing,
      isGeneratingBrief,
      isPrioritizing,
      selectedAssetId,
    ],
  );
  const runLabel = getWorkspaceRunLabel({
    isAnalyzing,
    isPrioritizing,
    isGeneratingBrief,
  });
  const canPrioritize = commandAvailability.prioritize.enabled;
  const canGenerateBrief = commandAvailability.generate_brief.enabled;

  const handleModuleToggle = useCallback((module: WorkspaceModule) => {
    setActiveModule((current) => toggleWorkspaceModule(current, module));
  }, []);

  const handleAssetSelect = useCallback(
    (assetId: string) => {
      selectAsset(assetId);
      setActiveModule("assets");
    },
    [selectAsset],
  );

  const handleUploadPhoto = useCallback(() => {
    attachDemoPhoto();
    setActiveModule("assets");
  }, [attachDemoPhoto]);

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
      setActiveModule("assets");
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

    setActiveModule("assets");
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
        setActiveModule("work");
      }
    },
    [issues, selectAsset],
  );

  const handlePrioritize = useCallback(async () => {
    if (!canPrioritize) {
      return;
    }

    setActiveModule("plan");
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

    setActiveModule("brief");
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

  const handleReset = useCallback(() => {
    resetDemo();
    setActiveModule(null);
  }, [resetDemo]);

  const inspector = activeModule ? (
    <WorkspaceInspector
      title={getModuleConfig(activeModule).title}
      onClose={() => setActiveModule(null)}
    >
      {activeModule === "map" ? (
        <LayerPanel layers={layers} onLayerChange={setLayers} />
      ) : null}
      {activeModule === "assets" ? (
        <div className="space-y-4">
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
          <AssetListPanel
            issues={issues}
            selectedAssetId={selectedAssetId}
            onAssetSelect={handleAssetSelect}
          />
        </div>
      ) : null}
      {activeModule === "work" ? (
        <div className="space-y-4">
          <IssueWorkListPanel
            issues={orderedIssues}
            dailyPlan={dailyPlan}
            highlightedIssueId={highlightedIssueId}
            onIssueSelect={handleIssueSelect}
          />
          <GeneratedWorkOrdersPanel
            workOrders={generatedWorkOrders}
            activeWorkOrderId={activeWorkOrderId}
            onIssueSelect={handleIssueSelect}
          />
        </div>
      ) : null}
      {activeModule === "plan" ? (
        <DailyPlanPanel
          status={prioritizationStatus}
          error={prioritizationError}
          dailyPlan={dailyPlan}
          trace={prioritizationTrace}
          modelDetails={prioritizationModelDetails}
          onIssueSelect={handleIssueSelect}
        />
      ) : null}
      {activeModule === "brief" ? (
        <MorningBriefPanel
          status={morningBriefStatus}
          error={morningBriefError}
          brief={morningBrief}
          trace={morningBriefTrace}
          modelDetails={morningBriefModelDetails}
          openWorkCount={activeIssueCount}
          onIssueSelect={handleIssueSelect}
        />
      ) : null}
    </WorkspaceInspector>
  ) : null;

  return (
    <div className="ops-shell grid h-screen grid-rows-[64px_minmax(0,1fr)] overflow-hidden bg-[#f7f8f5] text-slate-950">
      <WorkspaceAppBar
        openIssueCount={activeIssueCount}
        mapboxHealth={mapboxHealth}
      />

      <div className="grid min-h-0 grid-cols-[92px_minmax(0,1fr)]">
        <WorkspaceRail
          activeModule={activeModule}
          onModuleToggle={handleModuleToggle}
        />

        <main className="relative min-h-0 overflow-hidden bg-[#eef3ee]">
          <CourseMap
            selectedAssetId={selectedAssetId}
            issues={orderedIssues}
            highlightedIssueId={highlightedIssueId}
            layers={layers}
            onAssetSelect={handleAssetSelect}
            onMapHealthChange={handleMapHealthChange}
          />

          <WorkspaceHud
            selectedAsset={selectedAsset}
            openIssueCount={activeIssueCount}
            generatedWorkOrderCount={generatedWorkOrders.length}
            runLabel={runLabel}
            activeModule={activeModule}
            hasSelectedPhoto={hasSelectedPhoto}
          />

          <WorkspaceCommandBar
            availability={commandAvailability}
            isAnalyzing={isAnalyzing}
            isPrioritizing={isPrioritizing}
            isGeneratingBrief={isGeneratingBrief}
            hasSelectedPhoto={hasSelectedPhoto}
            inspectorOpen={Boolean(activeModule)}
            onUploadPhoto={handleUploadPhoto}
            onPhotoFileSelected={handlePhotoFileSelected}
            onAnalyze={handleAnalyze}
            onPrioritize={handlePrioritize}
            onMorningBrief={handleMorningBrief}
            onReset={handleReset}
          />

          {inspector}
        </main>
      </div>
    </div>
  );
}

function WorkspaceAppBar({
  openIssueCount,
  mapboxHealth,
}: {
  openIssueCount: number;
  mapboxHealth: MapboxClientHealth;
}) {
  return (
    <header className="z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#004225]">
          GDM
        </p>
        <h1 className="truncate text-lg font-semibold text-slate-950">
          {PRESIDIO_COURSE.name} GIS Operations
        </h1>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 md:inline-flex">
          {presidioAssets.length} assets
        </span>
        <span className="hidden border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 md:inline-flex">
          {openIssueCount} open issues
        </span>
        <ReadinessDot mapboxHealth={mapboxHealth} />
        <WeatherChip />
      </div>
    </header>
  );
}

function WorkspaceRail({
  activeModule,
  onModuleToggle,
}: {
  activeModule: WorkspaceModule | null;
  onModuleToggle: (module: WorkspaceModule) => void;
}) {
  return (
    <aside
      className="z-30 flex min-h-0 flex-col items-center gap-2 border-r border-slate-200 bg-white px-2 py-3 shadow-sm"
      aria-label="Workspace modules"
    >
      {moduleConfigs.map((module) => {
        const Icon = module.icon;
        const isActive = activeModule === module.id;

        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onModuleToggle(module.id)}
            aria-pressed={isActive}
            className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 border border-transparent bg-white text-xs font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 aria-pressed:border-[#004225] aria-pressed:bg-[#e8f1ec] aria-pressed:text-[#004225]"
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{module.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

function WorkspaceHud({
  selectedAsset,
  openIssueCount,
  generatedWorkOrderCount,
  runLabel,
  activeModule,
  hasSelectedPhoto,
}: {
  selectedAsset: DemoAsset | null | undefined;
  openIssueCount: number;
  generatedWorkOrderCount: number;
  runLabel: string;
  activeModule: WorkspaceModule | null;
  hasSelectedPhoto: boolean;
}) {
  const moduleLabel = activeModule ? getModuleConfig(activeModule).label : "Map";

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
      <HudChip label="Module" value={moduleLabel} />
      <HudChip
        label="Asset"
        value={selectedAsset ? selectedAsset.fieldId : "None"}
      />
      <HudChip label="Photo" value={hasSelectedPhoto ? "Ready" : "None"} />
      <HudChip label="Open" value={String(openIssueCount)} />
      <HudChip label="Orders" value={String(generatedWorkOrderCount)} />
      <HudChip label="AI" value={runLabel} emphasis={runLabel !== "Idle"} />
    </div>
  );
}

function HudChip({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
      <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span
        className={
          emphasis ? "font-semibold text-[#004225]" : "font-semibold text-slate-950"
        }
      >
        {value}
      </span>
    </span>
  );
}

function WorkspaceCommandBar({
  availability,
  isAnalyzing,
  isPrioritizing,
  isGeneratingBrief,
  hasSelectedPhoto,
  inspectorOpen,
  onUploadPhoto,
  onPhotoFileSelected,
  onAnalyze,
  onPrioritize,
  onMorningBrief,
  onReset,
}: {
  availability: WorkspaceCommandAvailability;
  isAnalyzing: boolean;
  isPrioritizing: boolean;
  isGeneratingBrief: boolean;
  hasSelectedPhoto: boolean;
  inspectorOpen: boolean;
  onUploadPhoto: () => void;
  onPhotoFileSelected: (file: File) => void;
  onAnalyze: () => void;
  onPrioritize: () => void;
  onMorningBrief: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="absolute bottom-4 left-4 z-30 flex min-h-14 items-center gap-2 overflow-x-auto border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur"
      style={{ right: inspectorOpen ? "472px" : "16px" }}
      aria-label="Workspace command bar"
    >
      <CommandButton
        label="upload photo"
        icon={Upload}
        primary
        enabled={availability.upload_photo.enabled}
        reason={availability.upload_photo.reason}
        onClick={onUploadPhoto}
      />
      <label
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:text-slate-300"
        title={availability.choose_image.reason ?? "Choose image"}
        aria-label="Choose image"
      >
        <ImageUp className="h-4 w-4" aria-hidden />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={!availability.choose_image.enabled}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            if (file) {
              onPhotoFileSelected(file);
              event.currentTarget.value = "";
            }
          }}
        />
      </label>
      <CommandButton
        label="analyze"
        icon={isAnalyzing ? LoaderCircle : Brain}
        busy={isAnalyzing}
        enabled={availability.analyze.enabled}
        reason={
          hasSelectedPhoto
            ? availability.analyze.reason
            : (availability.analyze.reason ?? "Upload a photo before analyzing.")
        }
        onClick={onAnalyze}
      />
      <CommandButton
        label="prioritize"
        icon={isPrioritizing ? LoaderCircle : Route}
        busy={isPrioritizing}
        enabled={availability.prioritize.enabled}
        reason={availability.prioritize.reason}
        onClick={onPrioritize}
      />
      <CommandButton
        label="generate brief"
        icon={isGeneratingBrief ? LoaderCircle : FileText}
        busy={isGeneratingBrief}
        enabled={availability.generate_brief.enabled}
        reason={availability.generate_brief.reason}
        onClick={onMorningBrief}
      />
      <button
        type="button"
        onClick={onReset}
        disabled={!availability.reset.enabled}
        className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        title={availability.reset.reason ?? "Reset demo"}
        aria-label="Reset demo"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function CommandButton({
  label,
  icon: Icon,
  enabled,
  reason,
  onClick,
  primary = false,
  busy = false,
}: {
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  reason: string | null;
  onClick: () => void;
  primary?: boolean;
  busy?: boolean;
}) {
  const className = primary
    ? "inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-[#004225] bg-[#004225] px-3 text-sm font-semibold text-white transition hover:bg-[#00351e] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
    : "inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-busy={busy}
      title={reason ?? label}
      aria-label={label}
      className={className}
    >
      <Icon className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
      {label}
    </button>
  );
}

function WorkspaceInspector({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="absolute bottom-4 right-4 top-4 z-30 flex w-[440px] max-w-[calc(100%-2rem)] flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-700 transition hover:bg-slate-50"
          aria-label="Close inspector"
          title="Close inspector"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

function GeneratedWorkOrdersPanel({
  workOrders,
  activeWorkOrderId,
  onIssueSelect,
}: {
  workOrders: GeneratedWorkOrder[];
  activeWorkOrderId: string | null;
  onIssueSelect: (issueId: string) => void;
}) {
  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Work orders
          </h2>
        </div>
        <span className="text-xs text-slate-500">{workOrders.length}</span>
      </div>

      {workOrders.length === 0 ? (
        <p className="border border-slate-800 bg-slate-900 p-3 text-sm text-slate-500">
          No generated work orders.
        </p>
      ) : (
        <div className="space-y-2">
          {workOrders.map((workOrder) => {
            const isActive = workOrder.id === activeWorkOrderId;

            return (
              <button
                key={workOrder.id}
                type="button"
                onClick={() => onIssueSelect(workOrder.issueId)}
                data-active={isActive}
                className="grid min-h-[96px] w-full gap-2 border border-slate-800 bg-slate-900 p-3 text-left text-sm transition hover:border-slate-500 data-[active=true]:border-[#004225]"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-slate-100">
                    {workOrder.title}
                  </span>
                  <span className="shrink-0 border border-slate-700 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                    {workOrder.priority}
                  </span>
                </span>
                <span className="text-xs text-slate-400">
                  {workOrder.id} / {workOrder.status} / {workOrder.fieldId}
                </span>
                <span className="text-xs text-slate-500">
                  {workOrder.issueId} / {Math.round(workOrder.confidence * 100)}
                  % confidence
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
