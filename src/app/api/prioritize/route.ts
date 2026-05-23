import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  PrioritizationError,
  prioritizeDailyWork,
} from "@/lib/server/prioritization-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await prioritizeDailyWork(payload);

    return NextResponse.json(result);
  } catch (error) {
    const status =
      error instanceof PrioritizationError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to prioritize open work.";

    return NextResponse.json(
      {
        error: message,
        trace: error instanceof PrioritizationError ? error.trace : [],
        modelDetails:
          error instanceof PrioritizationError ? error.modelDetails : null,
      },
      { status },
    );
  }
}
