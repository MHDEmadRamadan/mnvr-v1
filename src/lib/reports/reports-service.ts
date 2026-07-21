import type { SupabaseClient } from "@supabase/supabase-js";
import type { Issue } from "@/types/issue";
import type { ReportExportFormat, ReportFilters, ReportMetrics, ReportQueryResult } from "@/types/reports";
import { mapIssueFromRow, type IssueRowWithRelations } from "@/lib/issues-mapper";
import { computeReportMetrics } from "@/lib/reports/reports-metrics";
import { buildReportExportBuffer } from "@/lib/reports/reports-export";
import { logReportQuery, logReportQueryError } from "@/lib/reports/reports-debug";
import { ISSUES_ENRICHED_SELECT, ISSUES_FETCH_CHUNK, ISSUES_MAX_EXPORT_ROWS } from "@/lib/issues-query";
import {
  issueQueryFiltersToRpcPayload,
  reportFiltersToIssueQueryFilters,
} from "@/lib/issues/filter-rpc";
import { computeTotalPages } from "@/lib/issues/pipeline";

type SupabaseErrorShape = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type PageRow = { id: string; total_count: number | string };

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

async function pageIds(
  supabase: SupabaseClient,
  filters: ReportFilters,
  limit: number,
  offset: number,
): Promise<{ ids: string[]; total: number }> {
  const payload = issueQueryFiltersToRpcPayload(reportFiltersToIssueQueryFilters(filters));
  const { data, error } = await supabase.rpc("page_filtered_issues", {
    p_filters: payload,
    p_limit: limit,
    p_offset: offset,
    p_sort_key: "created_at",
    p_sort_asc: false,
  });
  if (error) {
    throwReportQueryError("page_filtered_issues", ISSUES_ENRICHED_SELECT, filters, error, {
      limit,
      offset,
    });
  }
  const rows = (data ?? []) as PageRow[];
  return {
    ids: rows.map((r) => r.id),
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  };
}

async function fetchByIds(supabase: SupabaseClient, ids: string[], filters: ReportFilters): Promise<Issue[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("issues").select(ISSUES_ENRICHED_SELECT).in("id", ids);
  if (error) {
    throwReportQueryError("fetchByIds", ISSUES_ENRICHED_SELECT, filters, error);
  }
  const mapped = ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow);
  const byId = new Map(mapped.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is Issue => Boolean(row));
}

export async function queryReportIssues(
  supabase: SupabaseClient,
  filters: ReportFilters,
  page: number,
  pageSize: number,
): Promise<ReportQueryResult> {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;

  logReportQuery({
    operation: "queryReportIssues",
    select: ISSUES_ENRICHED_SELECT,
    filters,
    page: safePage,
    pageSize,
    offset: from,
    limit: from + pageSize - 1,
  });

  const probe = await pageIds(supabase, filters, 1, 0);
  const total = probe.total;
  const totalPages = computeTotalPages(total, pageSize);
  const clampedPage = Math.min(safePage, totalPages);
  const offset = (clampedPage - 1) * pageSize;
  const pageResult =
    total === 0 ? { ids: [] as string[], total: 0 } : await pageIds(supabase, filters, pageSize, offset);
  const items = await fetchByIds(supabase, pageResult.ids, filters);

  return {
    items,
    total,
    page: clampedPage,
    pageSize,
    totalPages,
  };
}

/** Server-side chunked fetch for metrics — never sent to browser in bulk. */
export async function fetchReportIssuesForMetrics(
  supabase: SupabaseClient,
  filters: ReportFilters,
): Promise<Issue[]> {
  const rows: Issue[] = [];
  let offset = 0;

  logReportQuery({
    operation: "fetchReportIssuesForMetrics",
    select: ISSUES_ENRICHED_SELECT,
    filters,
  });

  while (rows.length < ISSUES_MAX_EXPORT_ROWS) {
    const page = await pageIds(supabase, filters, ISSUES_FETCH_CHUNK, offset);
    if (page.ids.length === 0) break;
    const batch = await fetchByIds(supabase, page.ids, filters);
    rows.push(...batch);
    if (page.ids.length < ISSUES_FETCH_CHUNK) break;
    offset += ISSUES_FETCH_CHUNK;
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
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const rows = await fetchReportIssuesForMetrics(supabase, filters);
  return buildReportExportBuffer(rows, format);
}

export { REPORTS_PAGE_SIZE_DEFAULT } from "@/lib/reports/reports-query";
