import type { ReportFilters } from "@/types/reports";
import { needsDeviceInnerJoin } from "@/lib/reports/reports-filters";
import { ISSUES_BASE_FIELDS } from "@/lib/issues-query";

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

function boolActive(value: string): boolean {
  return value === "true" || value === "false";
}

function textActive(value: string): boolean {
  return value.trim().length > 0;
}

function statusFilterActive(filters: ReportFilters): boolean {
  return (
    textActive(filters.softwareVersion) ||
    textActive(filters.flespiStatus) ||
    textActive(filters.screenStatus) ||
    textActive(filters.dotmatrixStatus) ||
    boolActive(filters.sshStatus)
  );
}

function replacementFilterActive(filters: ReportFilters): boolean {
  return (
    enumFilterActive(filters.ssd) ||
    enumFilterActive(filters.motherboard) ||
    enumFilterActive(filters.sataCable) ||
    textActive(filters.imeiChanged) ||
    textActive(filters.simChanged) ||
    boolActive(filters.deviceChanged)
  );
}

function enumFilterActive(value: string): boolean {
  return value.trim().length > 0;
}

/** Dedicated reporting select — separate from Issues CRUD query layer. */
export function buildReportsSelect(filters: ReportFilters): string {
  // PostgREST requires FK column hints — bare "device" / "vehicle" are not valid relation names.
  // device.vehicle_id -> public.vehicles (aliased as "vehicle" to match issues-mapper).
  const deviceJoin = needsDeviceInnerJoin(filters) ? "device:device_id!inner" : "device:device_id";
  const vehicleJoin = textActive(filters.vehicleNumber) ? "vehicle:vehicle_id!inner" : "vehicle:vehicle_id";
  const statusJoin = statusFilterActive(filters) ? "device_status!inner" : "device_status";
  const hardwareJoin =
    textActive(filters.motherboardType) || textActive(filters.pmmType) ? "hardware!inner" : "hardware";
  const storageJoin = textActive(filters.ssdType) ? "storage!inner" : "storage";
  const replacementsJoin = replacementFilterActive(filters) ? "replacements!inner" : "replacements";

  return `
    ${ISSUES_BASE_FIELDS},
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
      ${hardwareJoin} (
        ${HARDWARE_FIELDS}
      ),
      ${storageJoin} (
        ${STORAGE_FIELDS}
      ),
      ${replacementsJoin} (
        ${REPLACEMENTS_FIELDS}
      )
    )
  `;
}

function parseBoolFilter(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function endOfDayIso(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999Z`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyReportFilters<T extends Record<string, any>>(query: T, filters: ReportFilters): T {
  let q = query;

  if (textActive(filters.issueType)) q = q.ilike("issue_type", `%${filters.issueType.trim()}%`);
  if (textActive(filters.motherboardIssue)) {
    q = q.ilike("motherboard_issue", `%${filters.motherboardIssue.trim()}%`);
  }
  if (textActive(filters.pmmIssue)) q = q.ilike("pmm_issue", `%${filters.pmmIssue.trim()}%`);
  if (textActive(filters.ssdIssue)) q = q.ilike("ssd_issue", `%${filters.ssdIssue.trim()}%`);
  if (textActive(filters.otherIssue)) q = q.ilike("other_issue", `%${filters.otherIssue.trim()}%`);
  if (textActive(filters.issueSource)) q = q.ilike("issue_source", `%${filters.issueSource.trim()}%`);

  if (filters.createdFrom) q = q.gte("created_at", filters.createdFrom);
  if (filters.createdTo) q = q.lte("created_at", endOfDayIso(filters.createdTo));

  if (textActive(filters.deviceImei)) q = q.ilike("device.imei", `%${filters.deviceImei.trim()}%`);
  if (textActive(filters.vehicleNumber)) {
    q = q.ilike("device.vehicle.vehicle_number", `%${filters.vehicleNumber.trim()}%`);
  }
  if (textActive(filters.motherboardType)) {
    q = q.ilike("device.hardware.motherboard_type", `%${filters.motherboardType.trim()}%`);
  }
  if (textActive(filters.pmmType)) q = q.ilike("device.hardware.pmm_type", `%${filters.pmmType.trim()}%`);
  if (textActive(filters.ssdType)) q = q.ilike("device.storage.ssd_type", `%${filters.ssdType.trim()}%`);
  if (textActive(filters.softwareVersion)) {
    q = q.ilike("device.device_status.software_version", `%${filters.softwareVersion.trim()}%`);
  }
  if (textActive(filters.flespiStatus)) {
    q = q.ilike("device.device_status.flespi_status", `%${filters.flespiStatus.trim()}%`);
  }
  if (textActive(filters.screenStatus)) {
    q = q.ilike("device.device_status.screen_status", `%${filters.screenStatus.trim()}%`);
  }
  if (textActive(filters.dotmatrixStatus)) {
    q = q.ilike("device.device_status.dotmatrix_status", `%${filters.dotmatrixStatus.trim()}%`);
  }

  const ssh = parseBoolFilter(filters.sshStatus);
  if (ssh !== null) q = q.eq("device.device_status.ssh_status", ssh);

  if (enumFilterActive(filters.ssd)) q = q.eq("device.replacements.ssd", filters.ssd);
  if (enumFilterActive(filters.motherboard)) q = q.eq("device.replacements.motherboard", filters.motherboard);
  if (enumFilterActive(filters.sataCable)) q = q.eq("device.replacements.sata_cable", filters.sataCable);
  if (textActive(filters.imeiChanged)) {
    const v = filters.imeiChanged.trim().toLowerCase();
    if (v === "no change" || v === "false") {
      q = q.eq("device.replacements.imei_changed", false);
    } else if (v === "true") {
      q = q.eq("device.replacements.imei_changed", true);
    } else {
      q = q.ilike("device.replacements.imei_changed", `%${filters.imeiChanged.trim()}%`);
    }
  }
  if (textActive(filters.simChanged)) {
    const v = filters.simChanged.trim().toLowerCase();
    if (v === "no change" || v === "false") {
      q = q.eq("device.replacements.sim_changed", false);
    } else if (v === "true") {
      q = q.eq("device.replacements.sim_changed", true);
    } else {
      q = q.ilike("device.replacements.sim_changed", `%${filters.simChanged.trim()}%`);
    }
  }
  const deviceChanged = parseBoolFilter(filters.deviceChanged);
  if (deviceChanged !== null) q = q.eq("device.replacements.device_changed", deviceChanged);

  return q;
}

export const REPORTS_PAGE_SIZE_DEFAULT = 25;
export const REPORTS_FETCH_CHUNK = 1000;
export const REPORTS_MAX_EXPORT_ROWS = 50_000;
