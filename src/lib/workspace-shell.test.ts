import { describe, expect, it } from "vitest";

import {
  getWorkspaceCommandAvailability,
  getWorkspaceRunLabel,
  toggleWorkspaceModule,
} from "@/lib/workspace-shell";

describe("workspace shell state", () => {
  it("opens one inspector module at a time and closes the active module", () => {
    expect(toggleWorkspaceModule(null, "assets")).toBe("assets");
    expect(toggleWorkspaceModule("assets", "work")).toBe("work");
    expect(toggleWorkspaceModule("work", "work")).toBeNull();
  });

  it("requires a selected asset before photo commands are available", () => {
    const commands = getWorkspaceCommandAvailability({
      selectedAssetId: null,
      hasSelectedPhoto: false,
      openIssueCount: 2,
      isAnalyzing: false,
      isPrioritizing: false,
      isGeneratingBrief: false,
    });

    expect(commands.upload_photo.enabled).toBe(false);
    expect(commands.choose_image.enabled).toBe(false);
    expect(commands.analyze.enabled).toBe(false);
    expect(commands.prioritize.enabled).toBe(true);
    expect(commands.generate_brief.enabled).toBe(true);
  });

  it("enables analyze only after the selected asset has a photo", () => {
    const withoutPhoto = getWorkspaceCommandAvailability({
      selectedAssetId: "PGC-SPR-001",
      hasSelectedPhoto: false,
      openIssueCount: 1,
      isAnalyzing: false,
      isPrioritizing: false,
      isGeneratingBrief: false,
    });
    const withPhoto = getWorkspaceCommandAvailability({
      selectedAssetId: "PGC-SPR-001",
      hasSelectedPhoto: true,
      openIssueCount: 1,
      isAnalyzing: false,
      isPrioritizing: false,
      isGeneratingBrief: false,
    });

    expect(withoutPhoto.analyze.enabled).toBe(false);
    expect(withPhoto.analyze.enabled).toBe(true);
  });

  it("blocks AI commands while any AI run is active", () => {
    const commands = getWorkspaceCommandAvailability({
      selectedAssetId: "PGC-SPR-001",
      hasSelectedPhoto: true,
      openIssueCount: 1,
      isAnalyzing: false,
      isPrioritizing: true,
      isGeneratingBrief: false,
    });

    expect(commands.analyze.enabled).toBe(false);
    expect(commands.prioritize.enabled).toBe(false);
    expect(commands.generate_brief.enabled).toBe(false);
    expect(commands.reset.enabled).toBe(false);
  });

  it("labels the currently running AI workflow", () => {
    expect(
      getWorkspaceRunLabel({
        isAnalyzing: true,
        isPrioritizing: false,
        isGeneratingBrief: false,
      }),
    ).toBe("Analyzing");
    expect(
      getWorkspaceRunLabel({
        isAnalyzing: false,
        isPrioritizing: false,
        isGeneratingBrief: true,
      }),
    ).toBe("Briefing");
  });
});
