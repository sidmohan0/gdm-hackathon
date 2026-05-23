import { FunctionCallingConfigMode } from "@google/genai";
import { describe, expect, it } from "vitest";

import { prioritizationFunctionCallingConfig } from "@/lib/server/prioritization-service";
import { triageFunctionCallingConfig } from "@/lib/server/triage-service";

describe("Gemini function-calling configuration", () => {
  it("forces photo analysis to return the triage tool call", () => {
    expect(triageFunctionCallingConfig).toEqual({
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: ["submit_triage"],
    });
  });

  it("forces prioritization to return the daily plan tool call", () => {
    expect(prioritizationFunctionCallingConfig).toEqual({
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: ["submit_daily_plan"],
    });
  });
});
