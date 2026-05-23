import { NextResponse } from "next/server";

import { getServerReadiness } from "@/lib/server/readiness-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getServerReadiness();

  return NextResponse.json(readiness, {
    headers: {
      "Cache-Control": "private, max-age=15",
    },
  });
}
