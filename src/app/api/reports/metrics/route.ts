import { NextResponse } from "next/server";
import { createSupabaseClientForUser, getBearerToken, requireAdmin } from "@/lib/auth-server";
import { parseReportFilters } from "@/lib/reports/reports-filters";
import { computeReportMetricsForFilters } from "@/lib/reports/reports-service";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    const token = getBearerToken(request);
    return NextResponse.json(
      { error: token ? "Forbidden" : "Unauthorized" },
      { status: token ? 403 : 401 },
    );
  }

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseReportFilters(searchParams.get("filters"));

    const supabase = createSupabaseClientForUser(token);
    const metrics = await computeReportMetricsForFilters(supabase, filters);
    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report metrics failed";
    console.error("[reports:api:metrics]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
