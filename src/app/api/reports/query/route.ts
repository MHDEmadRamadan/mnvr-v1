import { NextResponse } from "next/server";
import { createSupabaseClientForUser, getBearerToken, requireAdmin } from "@/lib/auth-server";
import { parseReportFilters } from "@/lib/reports/reports-filters";
import { queryReportIssues } from "@/lib/reports/reports-service";
import { REPORTS_PAGE_SIZE_DEFAULT } from "@/lib/reports/reports-query";

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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(REPORTS_PAGE_SIZE_DEFAULT), 10) || REPORTS_PAGE_SIZE_DEFAULT),
    );

    const supabase = createSupabaseClientForUser(token);
    const result = await queryReportIssues(supabase, filters, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report query failed";
    console.error("[reports:api:query]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
