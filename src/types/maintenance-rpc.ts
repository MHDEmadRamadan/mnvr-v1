/** Raw issue row returned inside maintenance RPC `issues` array. */
export type MaintenanceRpcIssueRow = {
  id: string;
  device_id: string;
  issue_type: string | null;
  motherboard_issue: string | null;
  pmm_issue: string | null;
  ssd_issue: string | null;
  other_issue: string | null;
  description: string | null;
  issue_source: string | null;
  created_at: string;
};

/** Maintenance RPC return shape — 1 device, many issues. */
export type MaintenanceRpcResult = {
  device_id: string;
  issues: MaintenanceRpcIssueRow[];
};
