"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEMO_PHOTO_PATH,
  type DemoIssue,
  seedIssues,
} from "@/data/presidio-demo";

type DemoState = {
  selectedAssetId: string | null;
  issues: DemoIssue[];
  attachedPhotoAssetId: string | null;
  attachedPhotoPath: string | null;
  selectAsset: (assetId: string) => void;
  attachDemoPhoto: () => void;
  resetDemo: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      selectedAssetId: null,
      issues: seedIssues,
      attachedPhotoAssetId: null,
      attachedPhotoPath: null,
      selectAsset: (assetId) =>
        set((state) => ({
          selectedAssetId: assetId,
          attachedPhotoAssetId:
            state.attachedPhotoAssetId === assetId
              ? state.attachedPhotoAssetId
              : null,
          attachedPhotoPath:
            state.attachedPhotoAssetId === assetId
              ? state.attachedPhotoPath
              : null,
        })),
      attachDemoPhoto: () => {
        const selectedAssetId = get().selectedAssetId;

        if (!selectedAssetId) {
          return;
        }

        set({
          attachedPhotoAssetId: selectedAssetId,
          attachedPhotoPath: DEMO_PHOTO_PATH,
        });
      },
      resetDemo: () =>
        set({
          selectedAssetId: null,
          issues: seedIssues,
          attachedPhotoAssetId: null,
          attachedPhotoPath: null,
        }),
    }),
    {
      name: "gdm-demo-state-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedAssetId: state.selectedAssetId,
        issues: state.issues,
        attachedPhotoAssetId: state.attachedPhotoAssetId,
        attachedPhotoPath: state.attachedPhotoPath,
      }),
    },
  ),
);
