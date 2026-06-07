import { NextResponse } from "next/server";
import { parseReportFilters } from "@/lib/reports/reports-filters";
import { queryReportIssues } from "@/lib/reports/reports-service";
import { REPORTS_PAGE_SIZE_DEFAULT } from "@/lib/reports/reports-query";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportFilters(searchParams.get("filters"));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(REPORTS_PAGE_SIZE_DEFAULT), 10) || REPORTS_PAGE_SIZE_DEFAULT),
    );

    const result = await queryReportIssues(filters, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report query failed";
    console.error("[reports:api:query]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
