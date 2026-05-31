import type { Issue, IssueCreateInput } from "@/types/issue";

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

type VehicleJoin = { vehicle_number: string | null } | null;

type DeviceStatusRow = {
  software_version: string | null;
  flespi_status: string | null;
  screen_status: string | null;
  dotmatrix_status: string | null;
  ssh_status: boolean | null;
  pmm_software: number | null;
  created_at: string;
};

type HardwareRow = {
  motherboard_type: string | null;
  pmm_type: string | null;
  created_at: string;
};

type StorageRow = {
  ssd_type: string | null;
  disk_health: boolean | null;
  power_on_hours: number | null;
  power_cycles: number | null;
  power_off: number | null;
  lifetime: number | null;
  summary_ssd: string | null;
  created_at: string;
};

type ReplacementsRow = {
  new_ssd: boolean | null;
  new_motherboard: boolean | null;
  new_sata_cable: boolean | null;
  imei_changed: boolean | null;
  sim_changed: boolean | null;
  device_changed: boolean | null;
  created_at: string;
};

type DeviceJoin = {
  imei: string | null;
  vehicle?: VehicleJoin;
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

function str(value: string | null | undefined): string {
  return value ?? "";
}

function nullableStr(value: string | null | undefined): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return value;
}

export function mapIssueFromRow(row: IssueRowWithRelations): Issue {
  const device = row.device;
  const status = pickLatest(device?.device_status ?? null);
  const hardware = pickLatest(device?.hardware ?? null);
  const storage = pickLatest(device?.storage ?? null);
  const replacements = pickLatest(device?.replacements ?? null);

  return {
    id: row.id,
    deviceId: row.device_id,
    issueType: str(row.issue_type),
    motherboardIssue: str(row.motherboard_issue),
    pmmIssue: str(row.pmm_issue),
    ssdIssue: str(row.ssd_issue),
    otherIssue: str(row.other_issue),
    description: str(row.description),
    issueSource: str(row.issue_source),
    createdAt: row.created_at,
    deviceImei: nullableStr(device?.imei ?? null),
    vehicleNumber: nullableStr(device?.vehicle?.vehicle_number ?? null),
    softwareVersion: nullableStr(status?.software_version ?? null),
    flespiStatus: nullableStr(status?.flespi_status ?? null),
    screenStatus: nullableStr(status?.screen_status ?? null),
    dotMatrixStatus: nullableStr(status?.dotmatrix_status ?? null),
    sshStatus: status?.ssh_status ?? null,
    pmmSoftware: status?.pmm_software ?? null,
    motherboardType: nullableStr(hardware?.motherboard_type ?? null),
    pmmType: nullableStr(hardware?.pmm_type ?? null),
    ssdType: nullableStr(storage?.ssd_type ?? null),
    diskHealth: storage?.disk_health ?? null,
    powerOnHours: storage?.power_on_hours ?? null,
    powerCycles: storage?.power_cycles ?? null,
    powerOffCount: storage?.power_off ?? null,
    lifetime: storage?.lifetime ?? null,
    summarySsd: nullableStr(storage?.summary_ssd ?? null),
    newSsd: replacements?.new_ssd ?? null,
    newMotherboard: replacements?.new_motherboard ?? null,
    newSataCable: replacements?.new_sata_cable ?? null,
    imeiChanged: replacements?.imei_changed ?? null,
    simChanged: replacements?.sim_changed ?? null,
    deviceChanged: replacements?.device_changed ?? null,
  };
}

export function mapIssueToRow(input: Partial<IssueCreateInput>): Partial<IssueRow> {
  const row: Partial<IssueRow> = {};

  if (input.deviceId !== undefined) row.device_id = input.deviceId;
  if (input.issueType !== undefined) row.issue_type = input.issueType;
  if (input.motherboardIssue !== undefined) row.motherboard_issue = input.motherboardIssue;
  if (input.pmmIssue !== undefined) row.pmm_issue = input.pmmIssue;
  if (input.ssdIssue !== undefined) row.ssd_issue = input.ssdIssue;
  if (input.otherIssue !== undefined) row.other_issue = input.otherIssue;
  if (input.description !== undefined) row.description = input.description;
  if (input.issueSource !== undefined) row.issue_source = input.issueSource;

  return row;
}

export function mapIssueUpdateToRow(input: {
  issueType?: string;
  motherboardIssue?: string;
  pmmIssue?: string;
  ssdIssue?: string;
  otherIssue?: string;
  description?: string;
  issueSource?: string;
}): Partial<IssueRow> {
  const row: Partial<IssueRow> = {};
  if (input.issueType !== undefined) row.issue_type = input.issueType;
  if (input.motherboardIssue !== undefined) row.motherboard_issue = input.motherboardIssue;
  if (input.pmmIssue !== undefined) row.pmm_issue = input.pmmIssue;
  if (input.ssdIssue !== undefined) row.ssd_issue = input.ssdIssue;
  if (input.otherIssue !== undefined) row.other_issue = input.otherIssue;
  if (input.description !== undefined) row.description = input.description;
  if (input.issueSource !== undefined) row.issue_source = input.issueSource;
  return row;
}
