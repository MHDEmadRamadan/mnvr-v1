import type { IssueQueryFilters, IssueSort } from "@/types/issue";

const CRITICAL_OR =
  "issue_type.ilike.%critical%,issue_type.ilike.%urgent%,motherboard_issue.ilike.%critical%,motherboard_issue.ilike.%fail%,pmm_issue.ilike.%critical%,pmm_issue.ilike.%fail%,ssd_issue.ilike.%critical%,ssd_issue.ilike.%fail%";

const RESOLVED_OR = "issue_type.ilike.%resolved%,issue_type.ilike.%closed%";

const DEVICE_STATUS_FIELDS = `
  id,
  software_version,
  flespi_status,
  screen_status,
  dotmatrix_status,
  ssh_status,
  pmm_software,
  description,
  created_at
`;

const HARDWARE_FIELDS = `
  id,
  motherboard_type,
  pmm_type,
  description,
  created_at
`;

const STORAGE_FIELDS = `
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
`;

const REPLACEMENTS_FIELDS = `
  id,
  ssd,
  motherboard,
  sata_cable,
  imei_changed,
  sim_changed,
  device_changed,
  description,
  created_at
`;

/** Static enriched select for single-record CRUD returns. */
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
      ${DEVICE_STATUS_FIELDS}
    ),
    hardware (
      ${HARDWARE_FIELDS}
    ),
    storage (
      ${STORAGE_FIELDS}
    ),
    replacements (
      ${REPLACEMENTS_FIELDS}
    )
  )
`;

/** @deprecated Use ISSUES_ENRICHED_SELECT */
export const ISSUES_SELECT = ISSUES_ENRICHED_SELECT;

export const ISSUES_FETCH_CHUNK = 1000;
export const ISSUES_MAX_EXPORT_ROWS = 50_000;

function textActive(value?: string): boolean {
  return Boolean(value?.trim());
}

export function needsDeviceInnerJoin(filters: IssueQueryFilters): boolean {
  return (
    textActive(filters.deviceImei) ||
    textActive(filters.vehicleNumber) ||
    textActive(filters.globalSearch)
  );
}

export function needsStatusInnerJoin(filters: IssueQueryFilters): boolean {
  return textActive(filters.flespiStatus) || textActive(filters.screenStatus);
}

/** List select — uses !inner joins only when filters require them. */
export function buildIssuesSelect(filters: IssueQueryFilters): string {
  const deviceJoin = needsDeviceInnerJoin(filters) ? "device:device_id!inner" : "device:device_id";
  const vehicleJoin = textActive(filters.vehicleNumber)
    ? "vehicle:vehicle_id!inner"
    : "vehicle:vehicle_id";
  const statusJoin = needsStatusInnerJoin(filters) ? "device_status!inner" : "device_status";

  return `
    *,
    created_by_profile:created_by ( full_name, email ),
    resolved_by_profile:resolved_by ( full_name, email ),
    ${deviceJoin} (
      id,
      imei,
      description,
      tickets,
      ${vehicleJoin} (
        id,
        vehicle_number,
        description
      ),
      ${statusJoin} (
        ${DEVICE_STATUS_FIELDS}
      ),
      hardware (
        ${HARDWARE_FIELDS}
      ),
      storage (
        ${STORAGE_FIELDS}
      ),
      replacements (
        ${REPLACEMENTS_FIELDS}
      )
    )
  `;
}

export type IssueSortSpec = {
  column: string;
  ascending: boolean;
  foreignTable?: string;
};

/** Maps UI sort keys to PostgREST order columns. Joined telemetry columns fall back to created_at. */
export function resolveIssueSort(sort: IssueSort): IssueSortSpec {
  const ascending = sort.direction === "asc";
  const issueColumn = SORT_COLUMN_MAP[sort.key];
  if (issueColumn && issueColumn !== "created_at") {
    return { column: issueColumn, ascending };
  }

  switch (sort.key) {
    case "deviceImei":
      return { column: "imei", foreignTable: "device", ascending };
    case "deviceTickets":
      return { column: "tickets", foreignTable: "device", ascending };
    case "vehicleNumber":
      return { column: "vehicle_number", foreignTable: "device.vehicle", ascending };
    case "flespiStatus":
      return { column: "flespi_status", foreignTable: "device.device_status", ascending };
    case "screenStatus":
      return { column: "screen_status", foreignTable: "device.device_status", ascending };
    case "createdAt":
    default:
      return { column: "created_at", ascending: sort.key === "createdAt" ? ascending : false };
  }
}

export const SORT_COLUMN_MAP: Record<string, string> = {
  ssdIssue: "ssd_issue",
  issueType: "issue_type",
  motherboardIssue: "motherboard_issue",
  pmmIssue: "pmm_issue",
  otherIssue: "other_issue",
  description: "description",
  createdAt: "created_at",
  editedAt: "edited_at",
};

export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** PostgREST OR filter for global search across issue + device + vehicle text fields. */
export function buildGlobalSearchOr(query: string): string {
  const trimmed = query.trim().replace(/,/g, " ");
  if (!trimmed) return "";
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const parts = [
    `issue_type.ilike.${pattern}`,
    `motherboard_issue.ilike.${pattern}`,
    `pmm_issue.ilike.${pattern}`,
    `ssd_issue.ilike.${pattern}`,
    `other_issue.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `device.imei.ilike.${pattern}`,
    `device.vehicle.vehicle_number.ilike.${pattern}`,
    `device.device_status.flespi_status.ilike.${pattern}`,
    `device.device_status.screen_status.ilike.${pattern}`,
  ];
  return parts.join(",");
}

function endOfDayIso(dateOnly: string): string {
  if (dateOnly.includes("T")) return dateOnly;
  return `${dateOnly}T23:59:59.999Z`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyIssueFilters<T extends Record<string, any>>(query: T, filters: IssueQueryFilters): T {
  let q = query;

  if (filters.issueType?.trim()) {
    q = q.ilike("issue_type", `%${escapeIlikePattern(filters.issueType.trim())}%`);
  }
  if (filters.deviceImei?.trim()) {
    q = q.ilike("device.imei", `%${escapeIlikePattern(filters.deviceImei.trim())}%`);
  }
  if (filters.vehicleNumber?.trim()) {
    q = q.ilike(
      "device.vehicle.vehicle_number",
      `%${escapeIlikePattern(filters.vehicleNumber.trim())}%`,
    );
  }
  if (filters.flespiStatus?.trim()) {
    q = q.ilike(
      "device.device_status.flespi_status",
      `%${escapeIlikePattern(filters.flespiStatus.trim())}%`,
    );
  }
  if (filters.screenStatus?.trim()) {
    q = q.ilike(
      "device.device_status.screen_status",
      `%${escapeIlikePattern(filters.screenStatus.trim())}%`,
    );
  }
  if (filters.createdFrom) {
    q = q.gte("created_at", filters.createdFrom);
  }
  if (filters.createdTo) {
    q = q.lte("created_at", endOfDayIso(filters.createdTo));
  }
  if (filters.globalSearch?.trim()) {
    const orFilter = buildGlobalSearchOr(filters.globalSearch);
    if (orFilter) q = q.or(orFilter);
  }

  return q;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyIssueOrder<T extends Record<string, any>>(query: T, sort: IssueSort): T {
  const spec = resolveIssueSort(sort);
  if (spec.foreignTable) {
    return query.order(spec.column, {
      ascending: spec.ascending,
      foreignTable: spec.foreignTable,
    });
  }
  return query.order(spec.column, { ascending: spec.ascending });
}

export { CRITICAL_OR, RESOLVED_OR };
