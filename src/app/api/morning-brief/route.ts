import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  generateMorningBrief,
  MorningBriefError,
} from "@/lib/server/morning-brief-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await generateMorningBrief(payload);

    return NextResponse.json(result);
  } catch (error) {
    const status =
      error instanceof MorningBriefError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate Morning Superintendent Brief.";

    return NextResponse.json(
      {
        error: message,
        trace: error instanceof MorningBriefError ? error.trace : [],
        modelDetails:
          error instanceof MorningBriefError ? error.modelDetails : null,
      },
      { status },
    );
  }
}
