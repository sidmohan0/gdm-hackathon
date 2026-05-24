export const workspaceModules = [
  "map",
  "assets",
  "work",
  "plan",
  "brief",
] as const;

export type WorkspaceModule = (typeof workspaceModules)[number];

export type WorkspaceCommandId =
  | "upload_photo"
  | "choose_image"
  | "analyze"
  | "prioritize"
  | "generate_brief"
  | "reset";

export type WorkspaceBusyState = {
  isAnalyzing: boolean;
  isPrioritizing: boolean;
  isGeneratingBrief: boolean;
};

export type WorkspaceCommandInput = WorkspaceBusyState & {
  selectedAssetId: string | null;
  hasSelectedPhoto: boolean;
  openIssueCount: number;
};

export type WorkspaceCommandState = {
  enabled: boolean;
  reason: string | null;
};

export type WorkspaceCommandAvailability = Record<
  WorkspaceCommandId,
  WorkspaceCommandState
>;

export function toggleWorkspaceModule(
  current: WorkspaceModule | null,
  requested: WorkspaceModule,
): WorkspaceModule | null {
  return current === requested ? null : requested;
}

export function isWorkspaceBusy(state: WorkspaceBusyState) {
  return state.isAnalyzing || state.isPrioritizing || state.isGeneratingBrief;
}

export function getWorkspaceRunLabel(state: WorkspaceBusyState) {
  if (state.isAnalyzing) {
    return "Analyzing";
  }

  if (state.isPrioritizing) {
    return "Prioritizing";
  }

  if (state.isGeneratingBrief) {
    return "Briefing";
  }

  return "Idle";
}

function command(enabled: boolean, reason: string | null): WorkspaceCommandState {
  return {
    enabled,
    reason: enabled ? null : reason,
  };
}

export function getWorkspaceCommandAvailability(
  input: WorkspaceCommandInput,
): WorkspaceCommandAvailability {
  const busy = isWorkspaceBusy(input);
  const selected = Boolean(input.selectedAssetId);
  const hasOpenWork = input.openIssueCount > 0;

  return {
    upload_photo: command(
      selected && !busy,
      busy
        ? "Wait for the current AI run to finish."
        : "Select an asset before uploading a photo.",
    ),
    choose_image: command(
      selected && !busy,
      busy
        ? "Wait for the current AI run to finish."
        : "Select an asset before choosing an image.",
    ),
    analyze: command(
      selected && input.hasSelectedPhoto && !busy,
      busy
        ? "Wait for the current AI run to finish."
        : selected
          ? "Upload a photo before analyzing."
          : "Select an asset and upload a photo before analyzing.",
    ),
    prioritize: command(
      hasOpenWork && !busy,
      busy
        ? "Wait for the current AI run to finish."
        : "Open work is required before prioritizing.",
    ),
    generate_brief: command(
      hasOpenWork && !busy,
      busy
        ? "Wait for the current AI run to finish."
        : "Open work is required before generating a brief.",
    ),
    reset: command(!busy, "Wait for the current AI run to finish."),
  };
}
