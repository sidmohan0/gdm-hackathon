import { NextResponse } from "next/server";

import { getOpenMeteoWeather } from "@/lib/server/weather-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const weather = await getOpenMeteoWeather();

  return NextResponse.json(weather, {
    headers: {
      "Cache-Control": "private, max-age=120",
    },
  });
}
