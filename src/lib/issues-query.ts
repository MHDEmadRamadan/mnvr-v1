import type { IssueQueryFilters } from "@/types/issue";

const CRITICAL_OR =
  "issue_type.ilike.%critical%,issue_type.ilike.%urgent%,motherboard_issue.ilike.%critical%,motherboard_issue.ilike.%fail%,pmm_issue.ilike.%critical%,pmm_issue.ilike.%fail%,ssd_issue.ilike.%critical%,ssd_issue.ilike.%fail%";

const RESOLVED_OR = "issue_type.ilike.%resolved%,issue_type.ilike.%closed%";

/** Full enriched select for issues list + CRUD return payloads. */
export const ISSUES_ENRICHED_SELECT = `
  *,
  created_by_profile:created_by ( full_name, email ),
  resolved_by_profile:resolved_by ( full_name, email ),
  device:device_id (
    id,
    imei,
    description,
    tickets,
    vehicle:vehicle_id (
      id,
      vehicle_number,
      description
    ),
    device_status (
      id,
      software_version,
      flespi_status,
      screen_status,
      dotmatrix_status,
      ssh_status,
      pmm_software,
      description,
      created_at
    ),
    hardware (
      id,
      motherboard_type,
      pmm_type,
      description,
      created_at
    ),
    storage (
      id,
      ssd_type,
      disk_health,
      power_on_hours,
      power_cycles,
      power_off,
      lifetime,
      summary_ssd,
      description,
      created_at
    ),
    replacements (
      id,
      ssd,
      motherboard,
      sata_cable,
      imei_changed,
      sim_changed,
      device_changed,
      description,
      created_at
    )
  )
`;

/** @deprecated Use ISSUES_ENRICHED_SELECT */
export const ISSUES_SELECT = ISSUES_ENRICHED_SELECT;

export const SORT_COLUMN_MAP: Record<string, string> = {
  ssdIssue: "ssd_issue",
  _rowNum: "created_at",
  vehicleNumber: "created_at",
  deviceImei: "created_at",
  deviceTickets: "created_at",
  softwareVersion: "created_at",
  flespiStatus: "created_at",
  screenStatus: "created_at",
  dotMatrixStatus: "created_at",
  sshStatus: "created_at",
  pmmSoftware: "created_at",
  issueType: "issue_type",
  motherboardIssue: "motherboard_issue",
  pmmIssue: "pmm_issue",
  otherIssue: "other_issue",
  issueSource: "issue_source",
  motherboardType: "created_at",
  pmmType: "created_at",
  ssdType: "created_at",
  diskHealth: "created_at",
  powerOnHours: "created_at",
  powerCycles: "created_at",
  powerOffCount: "created_at",
  lifetime: "created_at",
  summarySsd: "created_at",
  ssd: "created_at",
  motherboard: "created_at",
  sataCable: "created_at",
  imeiChanged: "created_at",
  simChanged: "created_at",
  deviceChanged: "created_at",
  description: "description",
  createdAt: "created_at",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyIssueFilters<T extends Record<string, any>>(query: T, filters: IssueQueryFilters): T {
  let q = query;

  if (filters.issueType?.trim()) {
    q = q.ilike("issue_type", `%${filters.issueType.trim()}%`);
  }
  if (filters.deviceImei?.trim()) {
    q = q.ilike("device.imei", `%${filters.deviceImei.trim()}%`);
  }
  if (filters.issueSource?.trim()) {
    q = q.ilike("issue_source", `%${filters.issueSource.trim()}%`);
  }
  if (filters.createdFrom) {
    q = q.gte("created_at", filters.createdFrom);
  }
  if (filters.createdTo) {
    q = q.lte("created_at", filters.createdTo);
  }

  return q;
}

export { CRITICAL_OR, RESOLVED_OR };
