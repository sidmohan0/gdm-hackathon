import { describe, expect, it } from "vitest";

import type { DemoIssue } from "@/data/presidio-demo";
import {
  appendClientPrioritizationTrace,
  createPrioritizationStartedTrace,
  orderIssuesByDailyPlan,
  validateDailyPlanResponse,
  type DailyPlan,
} from "@/lib/daily-plan";

const issues = [
  { id: "PGC-ISS-101", status: "open" },
  { id: "PGC-ISS-102", status: "scheduled" },
  { id: "PGC-ISS-103", status: "open" },
] as DemoIssue[];

const dailyPlan: DailyPlan = {
  id: "GDM-DAILY-PLAN",
  generatedAt: "2026-05-23T12:00:00.000Z",
  source: "Gemini",
  modelId: "gemini-3.5-flash",
  weather: {
    status: "unavailable",
    source: "Open-Meteo",
    location: "Presidio Golf Course",
    fetchedAt: "2026-05-23T12:00:00.000Z",
  },
  summary: "Prioritize the lateral leak before the recessed valve cover.",
  items: [
    {
      rank: 1,
      issueId: "PGC-ISS-102",
      reason: "Water waste and playability risk are highest.",
      recommendedCrew: "Irrigation tech + assistant",
      estimatedDifficulty: "high",
      summary: "Repair suspected lateral leak.",
    },
    {
      rank: 2,
      issueId: "PGC-ISS-101",
      reason: "Mower safety risk remains near the green.",
      recommendedCrew: "Irrigation tech",
      estimatedDifficulty: "medium",
      summary: "Lower proud rotor head.",
    },
  ],
};

describe("daily plan contract", () => {
  it("validates and sorts Gemini daily plan output by rank", () => {
    const result = validateDailyPlanResponse(
      {
        summary: dailyPlan.summary,
        items: [...dailyPlan.items].reverse(),
      },
      issues.map((issue) => issue.id),
    );

    expect(result.items.map((item) => item.issueId)).toEqual([
      "PGC-ISS-102",
      "PGC-ISS-101",
    ]);
  });

  it("rejects plans that reference work outside the submitted issues", () => {
    expect(() =>
      validateDailyPlanResponse(
        {
          summary: dailyPlan.summary,
          items: [
            {
              ...dailyPlan.items[0],
              issueId: "GDM-ISS-UNKNOWN",
            },
          ],
        },
        issues.map((issue) => issue.id),
      ),
    ).toThrow("unknown issue");
  });

  it("reorders ranked issues while leaving unranked work in current order", () => {
    expect(orderIssuesByDailyPlan(issues, dailyPlan).map((issue) => issue.id))
      .toEqual(["PGC-ISS-102", "PGC-ISS-101", "PGC-ISS-103"]);
  });

  it("records client-side ordering and highlight steps after validation", () => {
    const trace = appendClientPrioritizationTrace({
      trace: createPrioritizationStartedTrace({
        openWorkCount: 3,
        workOrderCount: 1,
      }),
      topIssueId: "PGC-ISS-102",
      rankedCount: 2,
      at: "2026-05-23T12:01:00.000Z",
    });

    expect(trace.find((step) => step.id === "issue_order_applied")?.status)
      .toBe("complete");
    expect(trace.find((step) => step.id === "top_issue_highlighted")?.detail)
      .toContain("PGC-ISS-102");
  });
});
