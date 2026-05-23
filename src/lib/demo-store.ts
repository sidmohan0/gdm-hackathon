"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEMO_PHOTO_PATH,
  type DemoIssue,
  seedIssues,
} from "@/data/presidio-demo";
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
        set({
          analysisStatus: "succeeded",
          triageResult: result,
          analysisError: null,
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
      }),
    },
  ),
);
