import type { SupabaseClient } from "@supabase/supabase-js";
import type { Issue } from "@/types/issue";
import type { ReportExportFormat, ReportFilters, ReportMetrics, ReportQueryResult } from "@/types/reports";
import { mapIssueFromRow, type IssueRowWithRelations } from "@/lib/issues-mapper";
import { computeReportMetrics } from "@/lib/reports/reports-metrics";
import { buildReportExportBuffer } from "@/lib/reports/reports-export";
import { logReportQuery, logReportQueryError } from "@/lib/reports/reports-debug";
import {
  applyReportFilters,
  buildReportsSelect,
  REPORTS_FETCH_CHUNK,
  REPORTS_MAX_EXPORT_ROWS,
} from "@/lib/reports/reports-query";

type SupabaseErrorShape = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

function throwReportQueryError(
  operation: string,
  select: string,
  filters: ReportFilters,
  error: SupabaseErrorShape,
  extra?: Record<string, unknown>,
): never {
  logReportQueryError({ operation, select, filters, ...extra }, error);
  throw new Error(error.message);
}

function computeTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export async function queryReportIssues(
  supabase: SupabaseClient,
  filters: ReportFilters,
  page: number,
  pageSize: number,
): Promise<ReportQueryResult> {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const select = buildReportsSelect(filters);

  logReportQuery({
    operation: "queryReportIssues",
    select,
    filters,
    page: safePage,
    pageSize,
    offset: from,
    limit: to,
  });

  let query = supabase
    .from("issues")
    .select(select, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  query = applyReportFilters(query, filters);

  const { data, error, count } = await query;
  if (error) {
    throwReportQueryError("queryReportIssues", select, filters, error, { page: safePage, pageSize });
  }

  const total = count ?? 0;
  return {
    items: ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow),
    total,
    page: safePage,
    pageSize,
    totalPages: computeTotalPages(total, pageSize),
  };
}

/** Server-side chunked fetch for metrics — never sent to browser in bulk. */
export async function fetchReportIssuesForMetrics(
  supabase: SupabaseClient,
  filters: ReportFilters,
): Promise<Issue[]> {
  const select = buildReportsSelect(filters);
  const rows: Issue[] = [];
  let offset = 0;

  logReportQuery({
    operation: "fetchReportIssuesForMetrics",
    select,
    filters,
  });

  while (rows.length < REPORTS_MAX_EXPORT_ROWS) {
    let query = supabase
      .from("issues")
      .select(select)
      .order("created_at", { ascending: false })
      .range(offset, offset + REPORTS_FETCH_CHUNK - 1);

    query = applyReportFilters(query, filters);

    const { data, error } = await query;
    if (error) {
      throwReportQueryError("fetchReportIssuesForMetrics", select, filters, error, { offset });
    }

    const batch = ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow);
    if (batch.length === 0) break;

    rows.push(...batch);
    if (batch.length < REPORTS_FETCH_CHUNK) break;
    offset += REPORTS_FETCH_CHUNK;
  }

  return rows;
}

export async function computeReportMetricsForFilters(
  supabase: SupabaseClient,
  filters: ReportFilters,
): Promise<ReportMetrics> {
  const rows = await fetchReportIssuesForMetrics(supabase, filters);
  return computeReportMetrics(rows);
}

export async function exportReportIssues(
  supabase: SupabaseClient,
  filters: ReportFilters,
  format: ReportExportFormat,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const rows = await fetchReportIssuesForMetrics(supabase, filters);
  return buildReportExportBuffer(rows, format);
}
