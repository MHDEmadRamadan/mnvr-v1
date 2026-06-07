import { NextResponse } from "next/server";
import { parseReportFilters } from "@/lib/reports/reports-filters";
import { computeReportMetricsForFilters } from "@/lib/reports/reports-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportFilters(searchParams.get("filters"));

    const metrics = await computeReportMetricsForFilters(filters);
    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report metrics failed";
    console.error("[reports:api:metrics]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
