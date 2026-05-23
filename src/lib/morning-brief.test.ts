import { describe, expect, it } from "vitest";

import { seedIssues } from "@/data/presidio-demo";
import type { DailyPlan } from "@/lib/daily-plan";
import type { GeneratedWorkOrder } from "@/lib/generated-work";
import {
  appendClientMorningBriefTrace,
  buildMorningBriefPayload,
  createMorningBriefStartedTrace,
  validateMorningBriefResponse,
  type MorningBriefRequestIssue,
} from "@/lib/morning-brief";
import type { WeatherSnapshot } from "@/lib/weather";

const issues = seedIssues.map((issue) => ({
  id: issue.id,
  assetId: issue.assetId,
  fieldId: issue.fieldId,
  title: issue.title,
  severity: issue.severity,
  status: issue.status,
  openedAt: issue.openedAt,
  priorityScore: issue.priorityScore,
  summary: issue.summary,
  recommendedAction: issue.recommendedAction,
  source: issue.source,
  workOrderId: issue.workOrderId,
  confidence: issue.confidence,
})) satisfies MorningBriefRequestIssue[];

const workOrders: GeneratedWorkOrder[] = [
  {
    id: "GDM-WO-HEAD-1F1",
    issueId: "PGC-ISS-101",
    assetId: "PGC-SH-014",
    fieldId: "head-1f1",
    title: "Lower proud rotor head",
    priority: "high",
    status: "draft",
    recommendedActions: ["Lower rotor assembly", "Verify arc"],
    possibleParts: ["Riser", "Nozzle"],
    evidence: ["Photo shows head proud of grade"],
    confidence: 0.82,
    createdAt: "2026-05-23T12:00:00.000Z",
    updatedAt: "2026-05-23T12:00:00.000Z",
  },
];

const weather: WeatherSnapshot = {
  status: "unavailable",
  source: "Open-Meteo",
  location: "Presidio Golf Course",
  fetchedAt: "2026-05-23T12:00:00.000Z",
  reason: "Open-Meteo unavailable in test.",
};

const dailyPlan: DailyPlan = {
  id: "GDM-DAILY-PLAN",
  generatedAt: "2026-05-23T12:00:00.000Z",
  source: "Gemini",
  modelId: "gemini-3.5-flash",
  weather,
  summary: "Inspect the proud rotor before the lateral repair.",
  items: [
    {
      rank: 1,
      issueId: "PGC-ISS-101",
      reason: "Mower safety risk is visible before the first cut.",
      recommendedCrew: "Irrigation tech",
      estimatedDifficulty: "medium",
      summary: "Lower proud rotor head.",
    },
    {
      rank: 2,
      issueId: "PGC-ISS-102",
      reason: "Lateral repair is scheduled and should be staged.",
      recommendedCrew: "Irrigation tech + assistant",
      estimatedDifficulty: "high",
      summary: "Stage lateral repair.",
    },
  ],
};

const validBrief = {
  openingSummary:
    "Start with the visible mower-safety issue, then stage the wet lateral repair.",
  topPriorities: [
    {
      rank: 1,
      issueId: "PGC-ISS-101",
      assetId: "PGC-SH-014",
      workOrderId: "GDM-WO-HEAD-1F1",
      title: "Lower proud rotor beside No. 2 green",
      reason: "The head is proud of grade and can affect mowing near play.",
      recommendedAction: "Flag the location, lower the assembly, and verify arc.",
    },
  ],
  weatherWatch: {
    summary:
      "Weather is unavailable, so field conditions should be verified before irrigation changes.",
    concerns: ["Confirm actual moisture and wind before changing cycles."],
  },
  crewPlan: [
    {
      sequence: 1,
      window: "morning",
      crew: "Irrigation tech",
      focus: "Inspect and lower the proud rotor before mowing.",
      relatedIssueIds: ["PGC-ISS-101"],
      relatedWorkOrderIds: ["GDM-WO-HEAD-1F1"],
    },
  ],
  risksToVerify: [
    {
      risk: "Rotor repair may expose damaged riser threads.",
      verificationStep: "Check threads and nozzle arc before closing the work.",
      issueId: "PGC-ISS-101",
      assetId: "PGC-SH-014",
      workOrderId: "GDM-WO-HEAD-1F1",
    },
  ],
};

describe("morning superintendent brief contract", () => {
  it("falls back to severity ordering when no Prioritize plan exists", () => {
    const payload = buildMorningBriefPayload({
      issues,
      workOrders,
      activityLog: [],
      dailyPlan: null,
      weather,
      preparedAt: "2026-05-23T12:00:00.000Z",
    });

    expect(payload.ranking.source).toBe("severity_fallback");
    expect(payload.ranking.items.map((item) => item.issueId)).toEqual([
      "PGC-ISS-102",
      "PGC-ISS-101",
      "PGC-ISS-103",
      "PGC-ISS-104",
    ]);
  });

  it("uses the latest Prioritize ranking when available", () => {
    const payload = buildMorningBriefPayload({
      issues,
      workOrders,
      activityLog: [],
      dailyPlan,
      weather,
      preparedAt: "2026-05-23T12:00:00.000Z",
    });

    expect(payload.ranking.source).toBe("daily_plan");
    expect(payload.ranking.items.slice(0, 2).map((item) => item.issueId))
      .toEqual(["PGC-ISS-101", "PGC-ISS-102"]);
  });

  it("validates and sorts a managed-agent brief by known record IDs", () => {
    const result = validateMorningBriefResponse(
      {
        ...validBrief,
        topPriorities: [
          {
            ...validBrief.topPriorities[0],
            rank: 2,
          },
          {
            ...validBrief.topPriorities[0],
            rank: 1,
            issueId: "PGC-ISS-102",
            assetId: "PGC-LP-03",
            workOrderId: undefined,
            title: "Stage wet lateral repair",
          },
        ],
      },
      {
        issues,
        workOrders,
        assetIds: ["PGC-SH-014", "PGC-LP-03"],
      },
    );

    expect(result.topPriorities.map((item) => item.issueId)).toEqual([
      "PGC-ISS-102",
      "PGC-ISS-101",
    ]);
  });

  it("rejects recommendations that reference unknown records", () => {
    expect(() =>
      validateMorningBriefResponse(
        {
          ...validBrief,
          topPriorities: [
            {
              ...validBrief.topPriorities[0],
              issueId: "GDM-ISS-UNKNOWN",
            },
          ],
        },
        {
          issues,
          workOrders,
          assetIds: ["PGC-SH-014"],
        },
      ),
    ).toThrow("unknown issue");
  });

  it("normalizes managed-agent shorthand while preserving known ID checks", () => {
    const result = validateMorningBriefResponse(
      {
        openingSummary:
          "This plan is based on current severity and existing issue order.",
        topPriorities: [
          {
            issueId: "PGC-ISS-101",
            assetId: "PGC-SH-014",
            title: "Rotor head stuck high beside No. 2 green",
            recommendedAction:
              "Flag the head, lower assembly, and inspect riser threads.",
          },
        ],
        weatherWatch: {
          status: "available",
          notes:
            "Wind may affect spray patterns; verify field conditions first.",
        },
        crewPlan: [
          {
            window: "morning",
            role: "irrigation tech",
            activity:
              "Inspect PGC-SH-014 and lower the proud rotor assembly.",
          },
        ],
        risksToVerify: [
          {
            assetId: "PGC-SH-014",
            riskDescription:
              "Rotor head PGC-SH-014 may catch mower equipment near the collar.",
          },
        ],
      },
      {
        issues,
        workOrders,
        assetIds: ["PGC-SH-014"],
      },
    );

    expect(result.topPriorities[0].rank).toBe(1);
    expect(result.topPriorities[0].reason).toContain("Flag the head");
    expect(result.weatherWatch.summary).toContain("Wind may affect");
    expect(result.crewPlan[0].relatedAssetIds).toEqual(["PGC-SH-014"]);
    expect(result.risksToVerify[0].risk).toContain("Rotor head");
    expect(result.risksToVerify[0].issueId).toBe("PGC-ISS-101");
    expect(result.risksToVerify[0].assetId).toBe("PGC-SH-014");
  });

  it("fills sparse priority text from the matching source issue", () => {
    const result = validateMorningBriefResponse(
      {
        ...validBrief,
        topPriorities: [
          {
            issueId: "PGC-ISS-101",
            assetId: "PGC-SH-014",
            title: "Rotor head stuck high beside No. 2 green",
          },
        ],
      },
      {
        issues,
        workOrders,
        assetIds: ["PGC-SH-014"],
      },
    );

    expect(result.topPriorities[0].reason).toBe(issues[0].summary);
    expect(result.topPriorities[0].recommendedAction).toBe(
      issues[0].recommendedAction,
    );
  });

  it("bounds managed-agent priority lists and flattens keyed crew plans", () => {
    const result = validateMorningBriefResponse(
      {
        ...validBrief,
        topPriorities: [
          ...validBrief.topPriorities,
          {
            issueId: "PGC-ISS-102",
            assetId: "PGC-LP-03",
            title: "Soft wet spot over lateral pipe",
            recommendedAction:
              "Close the zone and pressure test the lateral pipe.",
          },
          {
            issueId: "PGC-ISS-103",
            assetId: "PGC-VLV-07",
            title: "Valve box cover sunk below collar",
            recommendedAction:
              "Raise the box ring and confirm it sits flush with the collar.",
          },
          {
            issueId: "PGC-ISS-104",
            assetId: "PGC-SH-033",
            title: "Nozzle arc drifting into native rough",
            recommendedAction:
              "Adjust the nozzle arc during the west-loop inspection.",
          },
          {
            issueId: "PGC-ISS-101",
            assetId: "PGC-SH-014",
            title: "Duplicate extra model priority",
            recommendedAction: "Do not render this fifth priority.",
          },
        ],
        crewPlan: {
          morning: {
            role: "irrigation tech",
            tasks: [
              "Inspect PGC-SH-014 before mowing and lower the proud rotor.",
            ],
          },
        },
      },
      {
        issues,
        workOrders,
        assetIds: ["PGC-SH-014", "PGC-LP-03", "PGC-VLV-07", "PGC-SH-033"],
      },
    );

    expect(result.topPriorities).toHaveLength(4);
    expect(result.topPriorities.map((priority) => priority.title)).not
      .toContain("Duplicate extra model priority");
    expect(result.crewPlan[0]).toMatchObject({
      window: "morning",
      crew: "irrigation tech",
      focus: "Inspect PGC-SH-014 before mowing and lower the proud rotor.",
      relatedAssetIds: ["PGC-SH-014"],
    });
  });

  it("records the local persistence trace step after a brief is accepted", () => {
    const trace = appendClientMorningBriefTrace({
      trace: createMorningBriefStartedTrace({
        openWorkCount: 4,
        workOrderCount: 1,
        activityLogCount: 0,
      }),
      at: "2026-05-23T12:01:00.000Z",
    });

    expect(trace.find((step) => step.id === "brief_saved")?.status).toBe(
      "complete",
    );
  });
});
