/**
 * Issue types — aligned with the `issues` table schema and related joins.
 * `Issue` / `IssueRow` is the flattened DTO used by the UI (no raw Supabase shape).
 */

export type Issue = {
  id: string;
  deviceId: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  description: string;
  issueSource: string;
  createdAt: string;
  deviceImei?: string | null;
  vehicleNumber?: string | null;
  softwareVersion?: string | null;
  flespiStatus?: string | null;
  screenStatus?: string | null;
  dotMatrixStatus?: string | null;
  sshStatus?: boolean | null;
  pmmSoftware?: number | null;
  motherboardType?: string | null;
  pmmType?: string | null;
  ssdType?: string | null;
  diskHealth?: boolean | null;
  powerOnHours?: number | null;
  powerCycles?: number | null;
  powerOffCount?: number | null;
  lifetime?: number | null;
  summarySsd?: string | null;
  newSsd?: boolean | null;
  newMotherboard?: boolean | null;
  newSataCable?: boolean | null;
  imeiChanged?: boolean | null;
  simChanged?: boolean | null;
  deviceChanged?: boolean | null;
};

/** UI-facing enriched row (alias of Issue). */
export type IssueRow = Issue;

export type IssueCreateInput = {
  deviceId: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  description: string;
  issueSource: string;
};

export type IssueUpdateInput = {
  issueType?: string;
  motherboardIssue?: string;
  pmmIssue?: string;
  ssdIssue?: string;
  otherIssue?: string;
  description?: string;
  issueSource?: string;
};

export type IssueQueryFilters = {
  issueType?: string;
  deviceImei?: string;
  issueSource?: string;
  vehicleNumber?: string;
  flespiStatus?: string;
  screenStatus?: string;
  /** Client-side full-text search across display fields. */
  globalSearch?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type IssueSort = {
  key: string;
  direction: "asc" | "desc";
};

export type IssueQueryParams = {
  filters: IssueQueryFilters;
  page: number;
  pageSize: number;
  sort: IssueSort;
};

export type IssueKpis = {
  total: number;
  open: number;
  resolved: number;
  critical: number;
};

export type IssueListResult = {
  items: Issue[];
  total: number;
};
