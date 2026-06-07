/**
 * Issue data access — single enriched Supabase query, DTO mapping, CRUD, realtime.
 */

import type {
  Issue,
  IssueCreateInput,
  IssueKpis,
  IssueListResult,
  IssueQueryFilters,
  IssueQueryParams,
  IssueUpdateInput,
} from "@/types/issue";
import { getSupabaseClient } from "@/lib/supabase";
import {
  mapIssueFromRow,
  type IssueRowWithRelations,
} from "@/lib/issues-mapper";
import { createMaintenanceRecord, updateMaintenanceRecord } from "@/lib/maintenance-record-api";
import { logIssuesFetch } from "@/lib/issues-debug";
import { runIssuePipeline } from "@/lib/issues/pipeline";
import {
  applyIssueFilters,
  CRITICAL_OR,
  ISSUES_ENRICHED_SELECT,
  RESOLVED_OR,
} from "@/lib/issues-query";

export type IssuesDbCounts = {
  issueRecords: number;
  devices: number;
};

const ENRICHED_FETCH_LIMIT = 10_000;

/** One optimized query: issues + device + vehicle + status + hardware + storage + replacements. */
export async function fetchEnrichedIssueDataset(
  filters: IssueQueryFilters,
): Promise<Issue[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("issues")
    .select(ISSUES_ENRICHED_SELECT)
    .order("created_at", { ascending: false })
    .limit(ENRICHED_FETCH_LIMIT);

  query = applyIssueFilters(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as IssueRowWithRelations[]).map(mapIssueFromRow);
}

export async function fetchIssues(
  params: IssueQueryParams,
): Promise<IssueListResult & { dbCounts?: IssuesDbCounts; safePage: number }> {
  const dataset = await fetchEnrichedIssueDataset(params.filters);
  const pipeline = runIssuePipeline(
    dataset,
    params.filters,
    params.sort,
    params.page,
    params.pageSize,
  );

  const deviceIds = new Set(dataset.map((r) => r.deviceId));

  logIssuesFetch({
    source: "issues-enriched",
    supabaseTotal: dataset.length,
    afterClientFilters: pipeline.filtered.length,
    page: pipeline.safePage,
    pageSize: params.pageSize,
    rowsReturned: pipeline.pageItems.length,
    activeFilters: describeActiveFilters(params.filters),
  });

  return {
    items: pipeline.pageItems,
    total: pipeline.total,
    safePage: pipeline.safePage,
    dbCounts: {
      issueRecords: dataset.length,
      devices: deviceIds.size,
    },
  };
}

function describeActiveFilters(filters: IssueQueryFilters): Record<string, string> {
  const active: Record<string, string> = {};
  if (filters.issueType) active.issueType = filters.issueType;
  if (filters.deviceImei) active.deviceImei = filters.deviceImei;
  if (filters.issueSource) active.issueSource = filters.issueSource;
  if (filters.createdFrom) active.createdFrom = filters.createdFrom;
  if (filters.createdTo) active.createdTo = filters.createdTo;
  return active;
}

export async function fetchIssueKpis(filters: IssueQueryFilters): Promise<IssueKpis> {
  const supabase = getSupabaseClient();

  const totalQuery = applyIssueFilters(
    supabase.from("issues").select("*", { count: "exact", head: true }),
    filters,
  );
  const resolvedQuery = applyIssueFilters(
    supabase.from("issues").select("*", { count: "exact", head: true }),
    filters,
  ).or(RESOLVED_OR);
  const criticalQuery = applyIssueFilters(
    supabase.from("issues").select("*", { count: "exact", head: true }),
    filters,
  ).or(CRITICAL_OR);

  const [totalRes, resolvedRes, criticalRes] = await Promise.all([
    totalQuery,
    resolvedQuery,
    criticalQuery,
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (resolvedRes.error) throw new Error(resolvedRes.error.message);
  if (criticalRes.error) throw new Error(criticalRes.error.message);

  const total = totalRes.count ?? 0;
  const resolved = resolvedRes.count ?? 0;
  const critical = criticalRes.count ?? 0;

  return {
    total,
    open: Math.max(0, total - resolved),
    resolved,
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

export function subscribeToIssues(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("issues-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
