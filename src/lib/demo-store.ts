"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEMO_PHOTO_PATH,
  type DemoIssue,
  getAssetById,
  seedIssues,
} from "@/data/presidio-demo";
import {
  appendClientCreationTrace,
  createAnalysisStartedTrace,
  createPhotoReceivedTrace,
  markTraceFailed,
  type AgentTraceStep,
  type AnalysisModelDetails,
} from "@/lib/agent-trace";
import {
  buildGeneratedArtifacts,
  type ActivityLogEntry,
  type GeneratedObservation,
  type GeneratedWorkOrder,
} from "@/lib/generated-work";
import type { TriageResult } from "@/lib/triage";

type AttachedPhoto = {
  assetId: string;
  path: string | null;
  dataUrl: string | null;
  name: string;
  mimeType: string;
};

type DemoState = {
  selectedAssetId: string | null;
  issues: DemoIssue[];
  attachedPhoto: AttachedPhoto | null;
  superintendentNote: string;
  analysisStatus: "idle" | "running" | "succeeded" | "failed";
  triageResult: TriageResult | null;
  analysisError: string | null;
  analysisTrace: AgentTraceStep[];
  analysisModelDetails: AnalysisModelDetails | null;
  generatedObservations: GeneratedObservation[];
  generatedWorkOrders: GeneratedWorkOrder[];
  activityLog: ActivityLogEntry[];
  activeWorkOrderId: string | null;
  selectAsset: (assetId: string) => void;
  attachDemoPhoto: () => void;
  attachUploadedPhoto: (photo: {
    dataUrl: string;
    name: string;
    mimeType: string;
  }) => void;
  setSuperintendentNote: (note: string) => void;
  startAnalysis: () => void;
  completeAnalysis: (
    result: TriageResult,
    trace?: AgentTraceStep[],
    modelDetails?: AnalysisModelDetails | null,
  ) => void;
  failAnalysis: (
    error: string,
    trace?: AgentTraceStep[],
    modelDetails?: AnalysisModelDetails | null,
  ) => void;
  resetDemo: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      selectedAssetId: null,
      issues: seedIssues,
      attachedPhoto: null,
      superintendentNote: "",
      analysisStatus: "idle",
      triageResult: null,
      analysisError: null,
      analysisTrace: [],
      analysisModelDetails: null,
      generatedObservations: [],
      generatedWorkOrders: [],
      activityLog: [],
      activeWorkOrderId: null,
      selectAsset: (assetId) =>
        set((state) => ({
          selectedAssetId: assetId,
          attachedPhoto:
            state.attachedPhoto?.assetId === assetId
              ? state.attachedPhoto
              : null,
          analysisStatus:
            state.attachedPhoto?.assetId === assetId
              ? state.analysisStatus
              : "idle",
          triageResult:
            state.attachedPhoto?.assetId === assetId ? state.triageResult : null,
          analysisError: null,
          analysisTrace:
            state.attachedPhoto?.assetId === assetId ? state.analysisTrace : [],
          analysisModelDetails:
            state.attachedPhoto?.assetId === assetId
              ? state.analysisModelDetails
              : null,
        })),
      attachDemoPhoto: () => {
        const selectedAssetId = get().selectedAssetId;

        if (!selectedAssetId) {
          return;
        }

        set({
          attachedPhoto: {
            assetId: selectedAssetId,
            path: DEMO_PHOTO_PATH,
            dataUrl: null,
            name: "demo-image.png",
            mimeType: "image/png",
          },
          analysisStatus: "idle",
          triageResult: null,
          analysisError: null,
          analysisTrace: createPhotoReceivedTrace({
            photoName: "demo-image.png",
            mimeType: "image/png",
          }),
          analysisModelDetails: null,
          activeWorkOrderId: null,
        });
      },
      attachUploadedPhoto: (photo) => {
        const selectedAssetId = get().selectedAssetId;

        if (!selectedAssetId) {
          return;
        }

        set({
          attachedPhoto: {
            assetId: selectedAssetId,
            path: null,
            dataUrl: photo.dataUrl,
            name: photo.name,
            mimeType: photo.mimeType,
          },
          analysisStatus: "idle",
          triageResult: null,
          analysisError: null,
          analysisTrace: createPhotoReceivedTrace({
            photoName: photo.name || "uploaded-photo",
            mimeType: photo.mimeType || "image/png",
          }),
          analysisModelDetails: null,
          activeWorkOrderId: null,
        });
      },
      setSuperintendentNote: (note) => set({ superintendentNote: note }),
      startAnalysis: () => {
        const photo = get().attachedPhoto;

        set({
          analysisStatus: "running",
          triageResult: null,
          analysisError: null,
          analysisTrace: createAnalysisStartedTrace({
            photoName: photo?.name ?? "field photo",
            mimeType: photo?.mimeType,
          }),
          analysisModelDetails: null,
          activeWorkOrderId: null,
        });
      },
      completeAnalysis: (result, trace, modelDetails) =>
        set((state) => {
          const asset = state.selectedAssetId
            ? getAssetById(state.selectedAssetId)
            : null;

          if (!asset || state.attachedPhoto?.assetId !== asset.id) {
            return {
              analysisStatus: "succeeded",
              triageResult: result,
              analysisError: null,
              analysisTrace: trace ?? state.analysisTrace,
              analysisModelDetails: modelDetails ?? state.analysisModelDetails,
            };
          }

          const existingWorkOrder = state.generatedWorkOrders.find(
            (workOrder) => workOrder.assetId === asset.id,
          );
          const logSequence =
            state.activityLog.filter((entry) => entry.assetId === asset.id)
              .length + 1;
          const artifacts = buildGeneratedArtifacts({
            asset,
            triage: result,
            clickedCoordinates: asset.coordinates,
            photoName: state.attachedPhoto.name,
            note: state.superintendentNote,
            logSequence,
            replacesExisting: Boolean(existingWorkOrder),
          });

          return {
            analysisStatus: "succeeded",
            triageResult: result,
            analysisError: null,
            analysisTrace: appendClientCreationTrace({
              trace: trace ?? state.analysisTrace,
              issueId: artifacts.issue.id,
              workOrderId: artifacts.workOrder.id,
              fieldId: asset.fieldId,
              priority: artifacts.workOrder.priority,
            }),
            analysisModelDetails: modelDetails ?? state.analysisModelDetails,
            issues: [
              ...state.issues.filter(
                (issue) => issue.id !== artifacts.issue.id,
              ),
              artifacts.issue,
            ],
            generatedObservations: [
              ...state.generatedObservations.filter(
                (observation) => observation.id !== artifacts.observation.id,
              ),
              artifacts.observation,
            ],
            generatedWorkOrders: [
              ...state.generatedWorkOrders.filter(
                (workOrder) => workOrder.id !== artifacts.workOrder.id,
              ),
              artifacts.workOrder,
            ],
            activityLog: [...state.activityLog, artifacts.activityLogEntry],
            activeWorkOrderId: artifacts.workOrder.id,
          };
        }),
      failAnalysis: (error, trace, modelDetails) =>
        set((state) => ({
          analysisStatus: "failed",
          analysisError: error,
          analysisTrace:
            trace ??
            markTraceFailed(
              state.analysisTrace.length > 0
                ? state.analysisTrace
                : createAnalysisStartedTrace({
                    photoName: state.attachedPhoto?.name ?? "field photo",
                    mimeType: state.attachedPhoto?.mimeType,
                  }),
              "gemini_requested",
              error,
            ),
          analysisModelDetails: modelDetails ?? state.analysisModelDetails,
          triageResult: null,
          activeWorkOrderId: null,
        })),
      resetDemo: () =>
        set({
          selectedAssetId: null,
          issues: seedIssues,
          attachedPhoto: null,
          superintendentNote: "",
          analysisStatus: "idle",
          triageResult: null,
          analysisError: null,
          analysisTrace: [],
          analysisModelDetails: null,
          generatedObservations: [],
          generatedWorkOrders: [],
          activityLog: [],
          activeWorkOrderId: null,
        }),
    }),
    {
      name: "gdm-demo-state-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedAssetId: state.selectedAssetId,
        issues: state.issues,
        attachedPhoto: state.attachedPhoto,
        superintendentNote: state.superintendentNote,
        analysisStatus: state.analysisStatus,
        triageResult: state.triageResult,
        analysisError: state.analysisError,
        analysisTrace: state.analysisTrace,
        analysisModelDetails: state.analysisModelDetails,
        generatedObservations: state.generatedObservations,
        generatedWorkOrders: state.generatedWorkOrders,
        activityLog: state.activityLog,
        activeWorkOrderId: state.activeWorkOrderId,
      }),
    },
  ),
);
