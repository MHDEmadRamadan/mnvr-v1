/**
 * Issue data access — server-paginated enriched queries, DTO mapping, CRUD, realtime.
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
  applyIssueFilters,
  applyIssueOrder,
  buildIssuesSelect,
  CRITICAL_OR,
  ISSUES_FETCH_CHUNK,
  ISSUES_MAX_EXPORT_ROWS,
} from "@/lib/issues-query";

export type IssuesDbCounts = {
  /** Filtered issue count from the server (not loaded row count). */
  issueRecords: number;
};

export type IssuePageResult = IssueListResult & {
  safePage: number;
  totalPages: number;
  dbCounts?: IssuesDbCounts;
};

/** Server-paginated enriched issues list with exact total count. */
export async function fetchIssues(params: IssueQueryParams): Promise<IssuePageResult> {
  const supabase = getSupabaseClient();
  const pageSize = Math.max(1, params.pageSize);
  const select = buildIssuesSelect(params.filters);

  const countQuery = applyIssueFilters(
    supabase.from("issues").select("id", { count: "exact", head: true }),
    params.filters,
  );
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);

  const total = totalCount ?? 0;
  const totalPages = computeTotalPages(total, pageSize);
  const safePage = clampPage(params.page, totalPages);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("issues").select(select).range(from, to);

  query = applyIssueFilters(query, params.filters);
  query = applyIssueOrder(query, params.sort);
  query = query.order("id", { ascending: params.sort.direction === "asc" });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items = ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow);

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

/** Chunked server fetch for CSV export — never loads the full table into memory at once. */
export async function fetchIssuesForExport(
  filters: IssueQueryFilters,
  sort: IssueSort,
): Promise<Issue[]> {
  const supabase = getSupabaseClient();
  const select = buildIssuesSelect(filters);
  const rows: Issue[] = [];
  let offset = 0;

  while (rows.length < ISSUES_MAX_EXPORT_ROWS) {
    let query = supabase
      .from("issues")
      .select(select)
      .range(offset, offset + ISSUES_FETCH_CHUNK - 1);

    query = applyIssueFilters(query, filters);
    query = applyIssueOrder(query, sort);
    query = query.order("id", { ascending: sort.direction === "asc" });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = ((data ?? []) as unknown as IssueRowWithRelations[]).map(mapIssueFromRow);
    if (batch.length === 0) break;

    rows.push(...batch);
    if (batch.length < ISSUES_FETCH_CHUNK) break;
    offset += ISSUES_FETCH_CHUNK;
  }

  return rows;
}

function describeActiveFilters(filters: IssueQueryFilters): Record<string, string> {
  const active: Record<string, string> = {};
  if (filters.issueType) active.issueType = filters.issueType;
  if (filters.deviceImei) active.deviceImei = filters.deviceImei;
  if (filters.vehicleNumber) active.vehicleNumber = filters.vehicleNumber;
  if (filters.flespiStatus) active.flespiStatus = filters.flespiStatus;
  if (filters.screenStatus) active.screenStatus = filters.screenStatus;
  if (filters.globalSearch) active.globalSearch = filters.globalSearch;
  if (filters.createdFrom) active.createdFrom = filters.createdFrom;
  if (filters.createdTo) active.createdTo = filters.createdTo;
  return active;
}

export async function fetchIssueKpis(filters: IssueQueryFilters): Promise<IssueKpis> {
  const supabase = getSupabaseClient();

  const totalQuery = applyIssueFilters(
    supabase.from("issues").select("id", { count: "exact", head: true }),
    filters,
  );
  const criticalQuery = applyIssueFilters(
    supabase.from("issues").select("id", { count: "exact", head: true }),
    filters,
  ).or(CRITICAL_OR);

  const [totalRes, criticalRes] = await Promise.all([totalQuery, criticalQuery]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (criticalRes.error) throw new Error(criticalRes.error.message);

  const total = totalRes.count ?? 0;
  const critical = criticalRes.count ?? 0;

  return {
    total,
    open: 0,
    resolved: 0,
    critical,
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
