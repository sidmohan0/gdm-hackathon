import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import {
  type ReadinessCheck,
  type ServerReadiness,
} from "@/lib/readiness";
import { MAPBOX_STYLE } from "@/lib/map-style";

const GEMINI_HEALTH_MODEL =
  process.env.GEMINI_HEALTH_MODEL ?? "gemini-2.5-flash-lite";
const READINESS_CACHE_MS = 45_000;
const MAPBOX_STYLE_URL = "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12";

const geminiHealthSchema = z.object({
  ok: z.literal(true),
  service: z.literal("gemini"),
  schemaVersion: z.literal(1),
});

let cachedReadiness:
  | {
      expiresAt: number;
      value: ServerReadiness;
    }
  | undefined;

function nowIso() {
  return new Date().toISOString();
}

function red(reason: string): ReadinessCheck {
  return {
    status: "red",
    reason,
    checkedAt: nowIso(),
  };
}

function green(reason: string): ReadinessCheck {
  return {
    status: "green",
    reason,
    checkedAt: nowIso(),
  };
}

function sanitizeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 180);
  }

  return "Unknown error";
}

export async function checkMapboxServerHealth(): Promise<ReadinessCheck> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return red("Mapbox token missing.");
  }

  try {
    const response = await fetch(
      `${MAPBOX_STYLE_URL}?access_token=${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      },
    );

    if (!response.ok) {
      return red(`Mapbox style request failed with HTTP ${response.status}.`);
    }

    return green(`Mapbox token accepted for ${MAPBOX_STYLE}.`);
  } catch (error) {
    return red(`Mapbox style check failed: ${sanitizeError(error)}.`);
  }
}

export async function checkGeminiHealth(): Promise<ReadinessCheck> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return red("Gemini key missing.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_HEALTH_MODEL,
      contents:
        "Return JSON only for a health check: ok true, service gemini, schemaVersion 1.",
      config: {
        temperature: 0,
        maxOutputTokens: 64,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            ok: {
              type: "boolean",
            },
            service: {
              type: "string",
              enum: ["gemini"],
            },
            schemaVersion: {
              type: "integer",
              enum: [1],
            },
          },
          required: ["ok", "service", "schemaVersion"],
          additionalProperties: false,
        },
      },
    });

    const parsedJson = JSON.parse(response.text ?? "");
    const parsed = geminiHealthSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return red("Gemini schema sanity response failed validation.");
    }

    return green("Gemini live schema sanity passed.");
  } catch (error) {
    return red(`Gemini health check failed: ${sanitizeError(error)}.`);
  }
}

export function summarizeServerReadiness(
  mapbox: ReadinessCheck,
  gemini: ReadinessCheck,
): ServerReadiness {
  if (mapbox.status === "red") {
    return {
      status: "red",
      reason: mapbox.reason,
      checkedAt: mapbox.checkedAt,
      checks: {
        mapbox,
        gemini,
      },
    };
  }

  if (gemini.status === "red") {
    return {
      status: "red",
      reason: gemini.reason,
      checkedAt: gemini.checkedAt,
      checks: {
        mapbox,
        gemini,
      },
    };
  }

  if (mapbox.status === "yellow" || gemini.status === "yellow") {
    const partial = mapbox.status === "yellow" ? mapbox : gemini;

    return {
      status: "yellow",
      reason: partial.reason,
      checkedAt: partial.checkedAt,
      checks: {
        mapbox,
        gemini,
      },
    };
  }

  return {
    status: "green",
    reason: "Mapbox configuration and Gemini schema sanity are healthy.",
    checkedAt: new Date(
      Math.max(Date.parse(mapbox.checkedAt), Date.parse(gemini.checkedAt)),
    ).toISOString(),
    checks: {
      mapbox,
      gemini,
    },
  };
}

export async function getServerReadiness() {
  const now = Date.now();

  if (cachedReadiness && cachedReadiness.expiresAt > now) {
    return cachedReadiness.value;
  }

  const [mapbox, gemini] = await Promise.all([
    checkMapboxServerHealth(),
    checkGeminiHealth(),
  ]);
  const value = summarizeServerReadiness(mapbox, gemini);

  cachedReadiness = {
    expiresAt: now + READINESS_CACHE_MS,
    value,
  };

  return value;
}
