import { NextResponse } from "next/server";
import { z } from "zod";

import type { LngLat } from "@/data/presidio-demo";
import {
  analyzePhotoWithGemini,
  TRIAGE_MODEL,
  TriageError,
} from "@/lib/server/triage-service";

export const dynamic = "force-dynamic";

const analyzeFormSchema = z.object({
  assetId: z.string().min(1),
  note: z.string().default(""),
  clickedLongitude: z.coerce.number(),
  clickedLatitude: z.coerce.number(),
});

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "type" in value
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = analyzeFormSchema.parse({
      assetId: formData.get("assetId"),
      note: formData.get("note") ?? "",
      clickedLongitude: formData.get("clickedLongitude"),
      clickedLatitude: formData.get("clickedLatitude"),
    });
    const photo = formData.get("photo");

    if (!isUploadedFile(photo)) {
      return NextResponse.json(
        { error: "Photo is required for Gemini analysis." },
        { status: 400 },
      );
    }

    const clickedCoordinates: LngLat = [
      parsed.clickedLongitude,
      parsed.clickedLatitude,
    ];
    const result = await analyzePhotoWithGemini({
      assetId: parsed.assetId,
      note: parsed.note,
      clickedCoordinates,
      photoBytes: await photo.arrayBuffer(),
      mimeType: photo.type || "image/png",
      photoName: "name" in photo ? photo.name : undefined,
    });

    return NextResponse.json({
      model: TRIAGE_MODEL,
      analyzedAt: result.analyzedAt,
      result: result.result,
      trace: result.trace,
      modelDetails: result.modelDetails,
    });
  } catch (error) {
    const status = error instanceof TriageError ? error.status : 400;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze the photo.";

    return NextResponse.json(
      {
        error: message,
        trace: error instanceof TriageError ? error.trace : [],
        modelDetails:
          error instanceof TriageError ? error.modelDetails : null,
      },
      { status },
    );
  }
}
