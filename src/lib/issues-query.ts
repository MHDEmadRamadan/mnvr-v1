import type { IssueQueryFilters } from "@/types/issue";

const CRITICAL_OR =
  "issue_type.ilike.%critical%,issue_type.ilike.%urgent%,motherboard_issue.ilike.%critical%,motherboard_issue.ilike.%fail%,pmm_issue.ilike.%critical%,pmm_issue.ilike.%fail%,ssd_issue.ilike.%critical%,ssd_issue.ilike.%fail%";

const RESOLVED_OR = "issue_type.ilike.%resolved%,issue_type.ilike.%closed%";

/**
 * Explicit `issues` base columns (the normalized set — NO `issues.vehicle_id`).
 * Selecting these explicitly (instead of `*`) decouples the app from the redundant
 * `issues.vehicle_id` column so it is unaffected by that column's removal. The vehicle is
 * always resolved via `issues.device_id → device.vehicle_id → vehicles` (see the embed below).
 */
export const ISSUES_BASE_FIELDS = `
  id,
  device_id,
  issue_type,
  motherboard_issue,
  pmm_issue,
  ssd_issue,
  other_issue,
  description,
  issue_source,
  created_at
`;

/** Full enriched select for issues list + CRUD return payloads. */
export const ISSUES_ENRICHED_SELECT = `
  ${ISSUES_BASE_FIELDS},
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
