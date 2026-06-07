import type { Issue, IssueCreateInput, IssueUpdateInput } from "@/types/issue";
import { getSupabaseClient } from "@/lib/supabase";
import { ISSUES_ENRICHED_SELECT } from "@/lib/issues-query";
import {
  maintenanceFormToRpcPayload,
  maintenanceUpdateToRpcPayload,
  mapIssueFromRow,
  type IssueRowWithRelations,
} from "@/lib/issues-mapper";
import {
  pickPrimaryIssueFromRpcResult,
  safeMaintenanceRpcCall,
} from "@/lib/maintenance-record-rpc";

async function fetchEnrichedIssueById(issueId: string): Promise<Issue> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUES_ENRICHED_SELECT)
    .eq("id", issueId)
    .single();

  if (error) throw new Error(error.message);
  return mapIssueFromRow(data as IssueRowWithRelations);
}

export async function createMaintenanceRecord(input: IssueCreateInput): Promise<Issue> {
  const supabase = getSupabaseClient();
  const rawPayload = maintenanceFormToRpcPayload(input);

  const rpcResult = await safeMaintenanceRpcCall(supabase, "create_maintenance_record", rawPayload);
  const created = pickPrimaryIssueFromRpcResult(rpcResult);

  return fetchEnrichedIssueById(created.id);
}

export async function updateMaintenanceRecord(input: IssueUpdateInput): Promise<Issue> {
  const supabase = getSupabaseClient();
  const rawPayload = maintenanceUpdateToRpcPayload(input);

  const rpcResult = await safeMaintenanceRpcCall(supabase, "update_maintenance_record", rawPayload);
  const updated = pickPrimaryIssueFromRpcResult(rpcResult, input.issueId);

  return fetchEnrichedIssueById(updated.id);
}

/** Fetch all enriched issues for a device after maintenance RPC (diagnostics / future UI). */
export async function fetchEnrichedIssuesForDevice(deviceId: string): Promise<Issue[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUES_ENRICHED_SELECT)
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as IssueRowWithRelations[]).map(mapIssueFromRow);
}
