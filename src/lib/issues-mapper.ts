import type { Issue } from "@/types/issue";
import type {
  MaintenanceRecordCreateInput,
  MaintenanceRecordFormValues,
  MaintenanceRecordUpdateInput,
} from "@/types/maintenance-record";
import type {
  ReplacementMotherboard,
  ReplacementSataCable,
  ReplacementSsd,
} from "@/types/replacements";
import {
  DEFAULT_REPLACEMENT_MOTHERBOARD,
  DEFAULT_REPLACEMENT_SATA_CABLE,
  DEFAULT_REPLACEMENT_SSD,
} from "@/types/replacements";
import { extractOptionalUuidString, extractUuidString } from "@/lib/maintenance-record-rpc";
import { coerceDbBoolean } from "@/lib/coerce-db-boolean";
import {
  dbReplacementValueToUi,
  formReplacementValueToDb,
} from "@/lib/replacements-value-mapper";

export type IssueRow = {
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

type VehicleJoin = {
  id: string;
  vehicle_number: string | null;
  description: string | null;
} | null;

type DeviceStatusRow = {
  id: string;
  software_version: string | null;
  flespi_status: string | null;
  screen_status: string | null;
  dotmatrix_status: string | null;
  ssh_status: boolean | null;
  pmm_software: number | null;
  description: string | null;
  created_at: string;
};

type HardwareRow = {
  id: string;
  motherboard_type: string | null;
  pmm_type: string | null;
  description: string | null;
  created_at: string;
};

type StorageRow = {
  id: string;
  ssd_type: string | null;
  disk_health: boolean | null;
  power_on_hours: number | null;
  power_cycles: number | null;
  power_off: number | null;
  lifetime: number | null;
  summary_ssd: string | null;
  description: string | null;
  created_at: string;
};

type ReplacementsRow = {
  id: string;
  ssd: ReplacementSsd | null;
  motherboard: ReplacementMotherboard | null;
  sata_cable: ReplacementSataCable | null;
  /** @deprecated Legacy boolean columns — read fallback only */
  new_ssd?: boolean | null;
  new_motherboard?: boolean | null;
  new_sata_cable?: boolean | null;
  imei_changed: boolean | string | number | null;
  sim_changed: boolean | string | number | null;
  device_changed: boolean | string | null;
  description: string | null;
  created_at: string;
};

function mapReplacementSsd(row: ReplacementsRow | null): ReplacementSsd | null {
  if (!row) return null;
  if (row.ssd) return row.ssd;
  if (row.new_ssd === true) return "NEW SSD";
  if (row.new_ssd === false) return "No";
  return null;
}

function mapReplacementMotherboard(row: ReplacementsRow | null): ReplacementMotherboard | null {
  if (!row) return null;
  if (row.motherboard) return row.motherboard;
  if (row.new_motherboard === true) return "NEW";
  if (row.new_motherboard === false) return "No";
  return null;
}

function mapReplacementSataCable(row: ReplacementsRow | null): ReplacementSataCable | null {
  if (!row) return null;
  if (row.sata_cable) return row.sata_cable;
  if (row.new_sata_cable === true) return "NEW";
  if (row.new_sata_cable === false) return "No";
  return null;
}

type DeviceJoin = {
  id: string;
  imei: string | null;
  description: string | null;
  tickets: string | null;
  vehicle?: VehicleJoin | VehicleJoin[];
  device_status?: DeviceStatusRow | DeviceStatusRow[] | null;
  hardware?: HardwareRow | HardwareRow[] | null;
  storage?: StorageRow | StorageRow[] | null;
  replacements?: ReplacementsRow | ReplacementsRow[] | null;
} | null;

export type IssueRowWithRelations = IssueRow & {
  device?: DeviceJoin;
};

type WithCreatedAt = { created_at: string };

function pickLatest<T extends WithCreatedAt>(rows: T | T[] | null | undefined): T | null {
  if (!rows) return null;
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return null;
  return list.reduce((latest, row) =>
    new Date(row.created_at).getTime() > new Date(latest.created_at).getTime() ? row : latest,
  );
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function str(value: string | null | undefined): string {
  return value ?? "";
}

function nullableStr(value: string | null | undefined): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return value;
}

/** Safely read a UUID from a join row id field (string or mistaken `{ id }` object). */
function joinRowId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    return extractUuidString(value, "relation_id");
  } catch {
    return null;
  }
}

export function mapIssueFromRow(row: IssueRowWithRelations): Issue {
  const device = row.device;
  const vehicle = pickOne(device?.vehicle ?? null);
  const status = pickLatest(device?.device_status ?? null);
  const hardware = pickLatest(device?.hardware ?? null);
  const storage = pickLatest(device?.storage ?? null);
  const replacements = pickLatest(device?.replacements ?? null);

  return {
    id: extractUuidString(row.id, "issue.id"),
    deviceId: extractUuidString(row.device_id ?? device?.id, "device_id"),
    issueType: str(row.issue_type),
    motherboardIssue: str(row.motherboard_issue),
    pmmIssue: str(row.pmm_issue),
    ssdIssue: str(row.ssd_issue),
    otherIssue: str(row.other_issue),
    description: str(row.description),
    issueSource: str(row.issue_source),
    createdAt: row.created_at,
    vehicleId: joinRowId(vehicle?.id),
    vehicleNumber: nullableStr(vehicle?.vehicle_number ?? null),
    vehicleDescription: nullableStr(vehicle?.description ?? null),
    deviceImei: nullableStr(device?.imei ?? null),
    deviceDescription: nullableStr(device?.description ?? null),
    deviceTickets: nullableStr(device?.tickets ?? null),
    deviceStatusId: joinRowId(status?.id),
    softwareVersion: nullableStr(status?.software_version ?? null),
    flespiStatus: nullableStr(status?.flespi_status ?? null),
    screenStatus: nullableStr(status?.screen_status ?? null),
    dotMatrixStatus: nullableStr(status?.dotmatrix_status ?? null),
    sshStatus: status ? coerceDbBoolean(status.ssh_status) : null,
    pmmSoftware: status?.pmm_software ?? null,
    deviceStatusDescription: nullableStr(status?.description ?? null),
    hardwareId: joinRowId(hardware?.id),
    motherboardType: nullableStr(hardware?.motherboard_type ?? null),
    pmmType: nullableStr(hardware?.pmm_type ?? null),
    hardwareDescription: nullableStr(hardware?.description ?? null),
    storageId: joinRowId(storage?.id),
    ssdType: nullableStr(storage?.ssd_type ?? null),
    diskHealth: storage ? coerceDbBoolean(storage.disk_health) : null,
    powerOnHours: storage?.power_on_hours ?? null,
    powerCycles: storage?.power_cycles ?? null,
    powerOffCount: storage?.power_off ?? null,
    lifetime: storage?.lifetime ?? null,
    summarySsd: nullableStr(storage?.summary_ssd ?? null),
    storageDescription: nullableStr(storage?.description ?? null),
    replacementsId: joinRowId(replacements?.id),
    ssd: mapReplacementSsd(replacements),
    motherboard: mapReplacementMotherboard(replacements),
    sataCable: mapReplacementSataCable(replacements),
    imeiChanged: replacements?.imei_changed ?? null,
    simChanged: replacements?.sim_changed ?? null,
    deviceChanged: coerceDbBoolean(replacements?.device_changed),
    replacementsDescription: nullableStr(replacements?.description ?? null),
  };
}

export function issueToMaintenanceForm(issue: Issue): MaintenanceRecordFormValues {
  return {
    vehicleNumber: issue.vehicleNumber ?? "",
    vehicleDescription: issue.vehicleDescription ?? "",
    imei: issue.deviceImei ?? "",
    deviceDescription: issue.deviceDescription ?? "",
    deviceTickets: issue.deviceTickets ?? "",
    softwareVersion: issue.softwareVersion ?? "",
    flespiStatus: issue.flespiStatus ?? "",
    screenStatus: issue.screenStatus ?? "",
    dotmatrixStatus: issue.dotMatrixStatus ?? "",
    sshStatus: issue.sshStatus ?? false,
    pmmSoftware: issue.pmmSoftware ?? null,
    deviceStatusDescription: issue.deviceStatusDescription ?? "",
    motherboardType: issue.motherboardType ?? "",
    pmmType: issue.pmmType ?? "",
    hardwareDescription: issue.hardwareDescription ?? "",
    ssdType: issue.ssdType ?? "",
    diskHealth: issue.diskHealth ?? false,
    powerOnHours: issue.powerOnHours ?? 0,
    powerCycles: issue.powerCycles ?? 0,
    powerOff: issue.powerOffCount ?? 0,
    lifetime: issue.lifetime ?? 0,
    summarySsd: issue.summarySsd ?? "",
    storageDescription: issue.storageDescription ?? "",
    ssd: issue.ssd ?? DEFAULT_REPLACEMENT_SSD,
    motherboard: issue.motherboard ?? DEFAULT_REPLACEMENT_MOTHERBOARD,
    sataCable: issue.sataCable ?? DEFAULT_REPLACEMENT_SATA_CABLE,
    imeiChanged: dbReplacementValueToUi(issue.imeiChanged, "imei_changed"),
    simChanged: dbReplacementValueToUi(issue.simChanged, "sim_changed"),
    deviceChanged: coerceDbBoolean(issue.deviceChanged),
    replacementsDescription: issue.replacementsDescription ?? "",
    issueType: issue.issueType ?? "",
    motherboardIssue: issue.motherboardIssue ?? "",
    pmmIssue: issue.pmmIssue ?? "",
    ssdIssue: issue.ssdIssue ?? "",
    otherIssue: issue.otherIssue ?? "",
    issueDescription: issue.description ?? "",
    issueSource: issue.issueSource ?? "",
  };
}

export function issueToMaintenanceUpdate(
  issue: Issue,
  formOverrides?: MaintenanceRecordFormValues,
): MaintenanceRecordUpdateInput {
  const form = formOverrides ?? issueToMaintenanceForm(issue);
  return {
    ...form,
    issueId: extractUuidString(issue.id, "issueId"),
    vehicleId: extractUuidString(issue.vehicleId, "vehicleId"),
    deviceId: extractUuidString(issue.deviceId, "deviceId"),
    deviceStatusId: issue.deviceStatusId ? extractUuidString(issue.deviceStatusId, "deviceStatusId") : null,
    hardwareId: issue.hardwareId ? extractUuidString(issue.hardwareId, "hardwareId") : null,
    storageId: issue.storageId ? extractUuidString(issue.storageId, "storageId") : null,
    replacementsId: issue.replacementsId ? extractUuidString(issue.replacementsId, "replacementsId") : null,
  };
}

type RpcPayload = Record<string, string | boolean | number | null>;

function numOrNull(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function maintenanceFormToRpcPayload(input: MaintenanceRecordCreateInput): RpcPayload {
  return {
    vehicle_number: input.vehicleNumber,
    vehicle_description: input.vehicleDescription,
    imei: input.imei,
    device_description: input.deviceDescription,
    device_tickets: input.deviceTickets,
    software_version: input.softwareVersion,
    flespi_status: input.flespiStatus,
    screen_status: input.screenStatus,
    dotmatrix_status: input.dotmatrixStatus,
    ssh_status: input.sshStatus,
    pmm_software: numOrNull(input.pmmSoftware),
    device_status_description: input.deviceStatusDescription,
    motherboard_type: input.motherboardType,
    pmm_type: input.pmmType,
    hardware_description: input.hardwareDescription,
    ssd_type: input.ssdType,
    disk_health: input.diskHealth,
    power_on_hours: input.powerOnHours,
    power_cycles: input.powerCycles,
    power_off: input.powerOff,
    lifetime: input.lifetime,
    summary_ssd: input.summarySsd,
    storage_description: input.storageDescription,
    ssd: input.ssd,
    motherboard: input.motherboard,
    sata_cable: input.sataCable,
    imei_changed: formReplacementValueToDb(input.imeiChanged, "imei_changed"),
    sim_changed: formReplacementValueToDb(input.simChanged, "sim_changed"),
    device_changed: coerceDbBoolean(input.deviceChanged),
    replacements_description: input.replacementsDescription,
    issue_type: input.issueType,
    motherboard_issue: input.motherboardIssue,
    pmm_issue: input.pmmIssue,
    ssd_issue: input.ssdIssue,
    other_issue: input.otherIssue,
    issue_description: input.issueDescription,
    issue_source: input.issueSource,
  };
}

export function maintenanceUpdateToRpcPayload(input: MaintenanceRecordUpdateInput): RpcPayload {
  return {
    ...maintenanceFormToRpcPayload(input),
    issue_id: extractUuidString(input.issueId, "issue_id"),
    vehicle_id: extractUuidString(input.vehicleId, "vehicle_id"),
    device_id: extractUuidString(input.deviceId, "device_id"),
    device_status_id: extractOptionalUuidString(input.deviceStatusId, "device_status_id"),
    hardware_id: extractOptionalUuidString(input.hardwareId, "hardware_id"),
    storage_id: extractOptionalUuidString(input.storageId, "storage_id"),
    replacements_id: extractOptionalUuidString(input.replacementsId, "replacements_id"),
  };
}

/** @deprecated Use maintenance record RPC mappers */
export function mapIssueToRow(): Partial<IssueRow> {
  return {};
}

/** @deprecated Use maintenance record RPC mappers */
export function mapIssueUpdateToRow(): Partial<IssueRow> {
  return {};
}
