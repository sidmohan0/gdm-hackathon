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
  completeAnalysis: (result: TriageResult) => void;
  failAnalysis: (error: string) => void;
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
          analysisError: null,
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
          analysisError: null,
        });
      },
      setSuperintendentNote: (note) => set({ superintendentNote: note }),
      startAnalysis: () =>
        set({
          analysisStatus: "running",
          analysisError: null,
        }),
      completeAnalysis: (result) =>
        set((state) => {
          const asset = state.selectedAssetId
            ? getAssetById(state.selectedAssetId)
            : null;

          if (!asset || state.attachedPhoto?.assetId !== asset.id) {
            return {
              analysisStatus: "succeeded",
              triageResult: result,
              analysisError: null,
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
      failAnalysis: (error) =>
        set({
          analysisStatus: "failed",
          analysisError: error,
        }),
      resetDemo: () =>
        set({
          selectedAssetId: null,
          issues: seedIssues,
          attachedPhoto: null,
          superintendentNote: "",
          analysisStatus: "idle",
          triageResult: null,
          analysisError: null,
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
        generatedObservations: state.generatedObservations,
        generatedWorkOrders: state.generatedWorkOrders,
        activityLog: state.activityLog,
        activeWorkOrderId: state.activeWorkOrderId,
      }),
    },
  ),
);
