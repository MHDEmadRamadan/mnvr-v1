/**
 * Issue types — aligned with the `issues` table schema and related joins.
 * `Issue` / `IssueRow` is the flattened DTO used by the UI (no raw Supabase shape).
 */

import type {
  MaintenanceRecordCreateInput,
  MaintenanceRecordUpdateInput,
} from "@/types/maintenance-record";
import type {
  ReplacementMotherboard,
  ReplacementSataCable,
  ReplacementSsd,
} from "@/types/replacements";

import type { IssueWorkflowStatus } from "@/types/auth";

export type Issue = {
  id: string;
  deviceId: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  /** Issue table description */
  description: string;
  createdAt: string;
  /** Kept for DB column compatibility; not used as a workflow in the UI. */
  status?: IssueWorkflowStatus;
  createdById?: string | null;
  createdByName?: string | null;
  /** Maps from DB `resolved_by` — displayed as Edited by. */
  editedById?: string | null;
  editedByName?: string | null;
  editedAt?: string | null;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  vehicleDescription?: string | null;
  deviceImei?: string | null;
  deviceDescription?: string | null;
  /** Jira ticket URL or reference from device.tickets */
  deviceTickets?: string | null;
  deviceStatusId?: string | null;
  softwareVersion?: string | null;
  flespiStatus?: string | null;
  screenStatus?: string | null;
  dotMatrixStatus?: string | null;
  sshStatus?: boolean | null;
  pmmSoftware?: number | null;
  deviceStatusDescription?: string | null;
  hardwareId?: string | null;
  motherboardType?: string | null;
  pmmType?: string | null;
  hardwareDescription?: string | null;
  storageId?: string | null;
  ssdType?: string | null;
  diskHealth?: boolean | null;
  powerOnHours?: number | null;
  powerCycles?: number | null;
  powerOffCount?: number | null;
  lifetime?: number | null;
  summarySsd?: string | null;
  storageDescription?: string | null;
  replacementsId?: string | null;
  ssd?: ReplacementSsd | null;
  motherboard?: ReplacementMotherboard | null;
  sataCable?: ReplacementSataCable | null;
  /** Raw replacements.imei_changed from DB — displayed as-is in tables/exports */
  imeiChanged: boolean | string | number | null;
  /** Raw replacements.sim_changed from DB — displayed as-is in tables/exports */
  simChanged: boolean | string | number | null;
  deviceChanged: boolean;
  replacementsDescription?: string | null;
};

/** UI-facing enriched row (alias of Issue). */
export type IssueRow = Issue;

/** Full maintenance record create payload (all related tables). */
export type IssueCreateInput = MaintenanceRecordCreateInput;

/** Full maintenance record update payload (all related tables + relation IDs). */
export type IssueUpdateInput = MaintenanceRecordUpdateInput;

/** One or more values — arrays mean OR within the field. */
export type TextFilterValue = string | string[];

/** Optional predicates for the Issues list / export / KPIs (SQL RPC). */
export type IssueQueryFilters = {
  issueType?: TextFilterValue;
  deviceImei?: TextFilterValue;
  vehicleNumber?: TextFilterValue;
  flespiStatus?: TextFilterValue;
  screenStatus?: TextFilterValue;
  /** Multi-field OR search across issues + related tables. */
  globalSearch?: string;
  createdFrom?: string;
  createdTo?: string;
  status?: IssueWorkflowStatus;
  vehicleDescription?: TextFilterValue;
  deviceTickets?: TextFilterValue;
  deviceDescription?: TextFilterValue;
  softwareVersion?: TextFilterValue;
  pmmSoftware?: TextFilterValue;
  motherboardType?: TextFilterValue;
  pmmType?: TextFilterValue;
  ssdType?: TextFilterValue;
  motherboardIssue?: TextFilterValue;
  pmmIssue?: TextFilterValue;
  ssdIssue?: TextFilterValue;
  otherIssue?: TextFilterValue;
  description?: TextFilterValue;
  deviceChanged?: boolean;
  ssd?: ReplacementSsd;
  motherboard?: ReplacementMotherboard;
  sataCable?: ReplacementSataCable;
  imeiChanged?: string;
  simChanged?: string;
  createdBy?: string;
  editedBy?: string;
  dotmatrixStatus?: TextFilterValue;
  sshStatus?: boolean;
  diskHealth?: boolean;
  powerOnHoursMin?: number;
  powerOnHoursMax?: number;
  powerCyclesMin?: number;
  powerCyclesMax?: number;
  powerOffCountMin?: number;
  powerOffCountMax?: number;
  lifetimeMin?: number;
  lifetimeMax?: number;
  summarySsd?: TextFilterValue;
  storageDescription?: TextFilterValue;
  hardwareDescription?: TextFilterValue;
  replacementsDescription?: TextFilterValue;
  deviceStatusDescription?: TextFilterValue;
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
