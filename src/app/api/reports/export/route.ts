import { NextResponse } from "next/server";
import type { ReportExportFormat } from "@/types/reports";
import { createSupabaseClientForUser, getBearerToken, requireAdmin } from "@/lib/auth-server";
import { parseReportFilters } from "@/lib/reports/reports-filters";
import { exportReportIssues } from "@/lib/reports/reports-service";

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
    const format = (searchParams.get("format") ?? "csv") as ReportExportFormat;

    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json({ error: "Invalid format. Use csv or xlsx." }, { status: 400 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { buffer, filename, contentType } = await exportReportIssues(supabase, filters, format);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report export failed";
    console.error("[reports:api:export]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
