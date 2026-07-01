import type { ReportFilters } from "@/types/reports";

type ReportQueryLogContext = {
  operation: string;
  select: string;
  filters: ReportFilters;
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
};

/** Server-side debug logging for Reports queries (visible in Next.js server logs). */
export function logReportQuery(context: ReportQueryLogContext): void {
  const normalizedSelect = context.select.replace(/\s+/g, " ").trim();
  if (normalizedSelect.includes("pmm_version")) {
    console.error("[reports:query:invalid-column]", {
      operation: context.operation,
      message: "Select contains removed column pmm_version",
      select: normalizedSelect,
    });
  }

  if (process.env.NODE_ENV === "production" && process.env.REPORTS_DEBUG !== "1") return;

  console.info("[reports:query]", {
    operation: context.operation,
    select: normalizedSelect,
    filters: context.filters,
    page: context.page,
    pageSize: context.pageSize,
    offset: context.offset,
    limit: context.limit,
  });
}

export function logReportQueryError(
  context: ReportQueryLogContext,
  error: { message: string; code?: string; details?: string; hint?: string },
): void {
  console.error("[reports:query:error]", {
    operation: context.operation,
    select: context.select.replace(/\s+/g, " ").trim(),
    filters: context.filters,
    supabase: {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
  });
}

