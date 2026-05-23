import { describe, expect, it } from "vitest";

import {
  appendClientCreationTrace,
  createEmptyAgentTrace,
  createPhotoReceivedTrace,
  markTraceFailed,
  setTraceStepStatus,
} from "@/lib/agent-trace";

describe("AI agent trace", () => {
  it("keeps the productized role names in a real stage order", () => {
    const trace = createEmptyAgentTrace();

    expect(trace.map((step) => step.role)).toEqual([
      "Vision Inspector",
      "GIS Context Agent",
      "Work Order Planner",
      "Work Order Planner",
      "Prioritization Planner",
      "Work Order Planner",
      "Work Order Planner",
    ]);
    expect(trace.map((step) => step.status)).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("starts from image receipt without pretending issue creation happened", () => {
    const trace = createPhotoReceivedTrace({
      photoName: "demo-image.png",
      mimeType: "image/png",
      at: "2026-05-23T12:00:00.000Z",
    });

    expect(trace.find((step) => step.id === "image_received")?.status).toBe(
      "complete",
    );
    expect(trace.find((step) => step.id === "issue_created")?.status).toBe(
      "pending",
    );
    expect(
      trace.find((step) => step.id === "image_received")?.detail,
    ).toContain("image + GIS analysis");
  });

  it("marks local issue and work order creation after validation succeeds", () => {
    const serverTrace = setTraceStepStatus(
      createPhotoReceivedTrace({ photoName: "demo-image.png" }),
      "structured_output_validated",
      "complete",
      { detail: "Schema accepted." },
    );
    const trace = appendClientCreationTrace({
      trace: serverTrace,
      issueId: "GDM-ISS-HEAD-1F1",
      workOrderId: "GDM-WO-HEAD-1F1",
      fieldId: "head-1f1",
      priority: "high",
      at: "2026-05-23T12:01:00.000Z",
    });

    expect(trace.find((step) => step.id === "issue_created")?.status).toBe(
      "complete",
    );
    expect(trace.find((step) => step.id === "work_order_created")?.detail).toBe(
      "GDM-WO-HEAD-1F1 drafted at high priority.",
    );
  });

  it("makes validation failures explicit and leaves creation pending", () => {
    const trace = markTraceFailed(
      createPhotoReceivedTrace({ photoName: "bad-output.png" }),
      "structured_output_validated",
      "Gemini structured output failed validation.",
      "2026-05-23T12:02:00.000Z",
    );

    expect(
      trace.find((step) => step.id === "structured_output_validated")?.status,
    ).toBe("failed");
    expect(trace.find((step) => step.id === "issue_created")?.status).toBe(
      "pending",
    );
    expect(trace.find((step) => step.id === "work_order_created")?.status).toBe(
      "pending",
    );
  });
});
