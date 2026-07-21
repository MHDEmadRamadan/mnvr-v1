/**
 * Issue data access — server-paginated via page_filtered_issues RPC + enriched select.
 */

import type {
  Issue,
  IssueCreateInput,
  IssueKpis,
  IssueListResult,
  IssueQueryFilters,
  IssueQueryParams,
  IssueSort,
  IssueUpdateInput,
} from "@/types/issue";
import { getSupabaseClient } from "@/lib/supabase";
import { mapIssueFromRow, type IssueRowWithRelations } from "@/lib/issues-mapper";
import { createMaintenanceRecord, updateMaintenanceRecord } from "@/lib/maintenance-record-api";
import { computeTotalPages, clampPage } from "@/lib/issues/pipeline";
import { logIssuesFetch } from "@/lib/issues-debug";
import {
  ISSUES_ENRICHED_SELECT,
  ISSUES_FETCH_CHUNK,
  ISSUES_MAX_EXPORT_ROWS,
} from "@/lib/issues-query";
import {
  issueQueryFiltersToRpcPayload,
  resolveFilterSort,
} from "@/lib/issues/filter-rpc";

export type IssuesDbCounts = {
  issueRecords: number;
};

export type IssuePageResult = IssueListResult & {
  safePage: number;
  totalPages: number;
  dbCounts?: IssuesDbCounts;
};

type PageRow = { id: string; total_count: number | string };

async function pageFilteredIssueIds(
  filters: IssueQueryFilters,
  limit: number,
  offset: number,
  sort: IssueSort,
  extras?: { criticalOnly?: boolean },
): Promise<{ ids: string[]; total: number }> {
  const supabase = getSupabaseClient();
  const { sortKey, ascending } = resolveFilterSort(sort);
  const payload = issueQueryFiltersToRpcPayload(filters, extras);

  const { data, error } = await supabase.rpc("page_filtered_issues", {
    p_filters: payload,
    p_limit: limit,
    p_offset: offset,
    p_sort_key: sortKey,
    p_sort_asc: ascending,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PageRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { ids: rows.map((r) => r.id), total };
}

async function fetchIssuesByIds(ids: string[]): Promise<Issue[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("issues").select(ISSUES_ENRICHED_SELECT).in("id", ids);
  if (error) throw new Error(error.message);

  const mapped = ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow);
  const byId = new Map(mapped.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is Issue => Boolean(row));
}

/** Server-paginated enriched issues list with exact total count (same filter engine). */
export async function fetchIssues(params: IssueQueryParams): Promise<IssuePageResult> {
  const pageSize = Math.max(1, params.pageSize);
  const requestedFrom = (Math.max(1, params.page) - 1) * pageSize;

  let page = await pageFilteredIssueIds(params.filters, pageSize, requestedFrom, params.sort);
  const total = page.total;
  const totalPages = computeTotalPages(total, pageSize);
  const safePage = clampPage(params.page, totalPages);

  if (safePage !== Math.max(1, params.page)) {
    const from = (safePage - 1) * pageSize;
    page = total === 0 ? { ids: [], total: 0 } : await pageFilteredIssueIds(params.filters, pageSize, from, params.sort);
  }

  const items = await fetchIssuesByIds(page.ids);

  logIssuesFetch({
    source: "issues-paginated",
    supabaseTotal: total,
    afterClientFilters: total,
    page: safePage,
    pageSize,
    rowsReturned: items.length,
    activeFilters: describeActiveFilters(params.filters),
  });

  return {
    items,
    total,
    safePage,
    totalPages,
    dbCounts: { issueRecords: total },
  };
}

/** Chunked server fetch for CSV export — same RPC filters as the list. */
export async function fetchIssuesForExport(
  filters: IssueQueryFilters,
  sort: IssueSort,
): Promise<Issue[]> {
  const rows: Issue[] = [];
  let offset = 0;

  while (rows.length < ISSUES_MAX_EXPORT_ROWS) {
    const page = await pageFilteredIssueIds(filters, ISSUES_FETCH_CHUNK, offset, sort);
    if (page.ids.length === 0) break;
    const batch = await fetchIssuesByIds(page.ids);
    rows.push(...batch);
    if (page.ids.length < ISSUES_FETCH_CHUNK) break;
    offset += ISSUES_FETCH_CHUNK;
  }

  return rows;
}

function describeActiveFilters(filters: IssueQueryFilters): Record<string, string> {
  const active: Record<string, string> = {};
  for (const [key, value] of Object.entries(issueQueryFiltersToRpcPayload(filters))) {
    active[key] = String(value);
  }
  return active;
}

export async function fetchIssueKpis(filters: IssueQueryFilters): Promise<IssueKpis> {
  const supabase = getSupabaseClient();
  const base = issueQueryFiltersToRpcPayload(filters);
  const critical = issueQueryFiltersToRpcPayload(filters, { criticalOnly: true });

  const [totalRes, criticalRes] = await Promise.all([
    supabase.rpc("count_filtered_issues", { p_filters: base }),
    supabase.rpc("count_filtered_issues", { p_filters: critical }),
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (criticalRes.error) throw new Error(criticalRes.error.message);

  return {
    total: Number(totalRes.data ?? 0),
    open: 0,
    resolved: 0,
    critical: Number(criticalRes.data ?? 0),
  };
}

export async function createIssue(input: IssueCreateInput): Promise<Issue> {
  return createMaintenanceRecord(input);
}

export async function updateIssue(id: string, patch: IssueUpdateInput): Promise<Issue> {
  return updateMaintenanceRecord({ ...patch, issueId: id });
}

export async function deleteIssues(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabaseClient();
  const uniqueIds = [...new Set(ids)];
  const { error } = await supabase.rpc("delete_maintenance_records", {
    p_issue_ids: uniqueIds,
  });
  if (error) throw new Error(error.message);
}

export async function deleteIssue(id: string): Promise<void> {
  await deleteIssues([id]);
}

import { subscribeToIssueChanges, type IssueRealtimeEvent } from "@/lib/issues/issues-realtime";

export type { IssueRealtimeEvent };

/** @deprecated Use subscribeToIssueChanges from issues-realtime.ts */
export function subscribeToIssues(onChange: () => void): () => void {
  return subscribeToIssueChanges(() => onChange());
}
