"use client";

import { ClipboardList } from "lucide-react";

import { getAssetById, type DemoIssue } from "@/data/presidio-demo";
import type { DailyPlan } from "@/lib/daily-plan";
import { severityColors } from "@/lib/map-style";

type IssueWorkListPanelProps = {
  issues: DemoIssue[];
  dailyPlan: DailyPlan | null;
  highlightedIssueId: string | null;
  onIssueSelect: (issueId: string) => void;
};

export function IssueWorkListPanel({
  issues,
  dailyPlan,
  highlightedIssueId,
  onIssueSelect,
}: IssueWorkListPanelProps) {
  const rankByIssueId = new Map(
    dailyPlan?.items.map((item) => [item.issueId, item.rank] as const) ?? [],
  );
  const openWork = issues.filter((issue) => issue.status !== "resolved");

  return (
    <section className="border border-slate-700 bg-slate-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Open work
          </h2>
        </div>
        <span className="text-xs text-slate-500">{openWork.length}</span>
      </div>

      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {openWork.map((issue) => {
          const asset = getAssetById(issue.assetId);
          const rank = rankByIssueId.get(issue.id);
          const isHighlighted = issue.id === highlightedIssueId;

          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => onIssueSelect(issue.id)}
              className="grid min-h-[88px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 border border-slate-800 bg-slate-900 px-3 py-3 text-left text-sm transition hover:border-slate-500 data-[highlight=true]:border-amber-300 data-[highlight=true]:bg-slate-800"
              data-highlight={isHighlighted}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: severityColors[issue.severity] }}
                aria-label={`${issue.severity} severity`}
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-100">
                  {issue.title}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-400">
                  {issue.id} / {issue.status} / {asset?.fieldId ?? issue.assetId}
                </span>
                <span className="mt-2 block text-xs text-slate-500">
                  {issue.summary}
                </span>
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-700 text-xs font-semibold text-slate-300 data-[ranked=true]:border-emerald-500 data-[ranked=true]:text-emerald-200"
                data-ranked={Boolean(rank)}
              >
                {rank ?? issue.priorityScore}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
