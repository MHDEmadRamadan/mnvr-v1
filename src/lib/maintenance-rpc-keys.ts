/** Allowed snake_case keys for maintenance RPC payloads (single source of truth). */

export const MAINTENANCE_RPC_FORM_KEYS = [
  "vehicle_number",
  "vehicle_description",
  "imei",
  "device_description",
  "device_tickets",
  "software_version",
  "flespi_status",
  "screen_status",
  "dotmatrix_status",
  "ssh_status",
  "pmm_software",
  "device_status_description",
  "motherboard_type",
  "pmm_type",
  "hardware_description",
  "ssd_type",
  "disk_health",
  "power_on_hours",
  "power_cycles",
  "power_off",
  "lifetime",
  "summary_ssd",
  "storage_description",
  "ssd",
  "motherboard",
  "sata_cable",
  "imei_changed",
  "sim_changed",
  "device_changed",
  "replacements_description",
  "issue_type",
  "motherboard_issue",
  "pmm_issue",
  "ssd_issue",
  "other_issue",
  "issue_description",
  "issue_source",
] as const;

export const MAINTENANCE_RPC_UPDATE_ID_KEYS = [
  "issue_id",
  "vehicle_id",
  "device_id",
  "device_status_id",
  "hardware_id",
  "storage_id",
  "replacements_id",
] as const;

export type MaintenanceRpcFormKey = (typeof MAINTENANCE_RPC_FORM_KEYS)[number];
export type MaintenanceRpcUpdateIdKey = (typeof MAINTENANCE_RPC_UPDATE_ID_KEYS)[number];

export const MAINTENANCE_RPC_KEY_SET = new Set<string>([
  ...MAINTENANCE_RPC_FORM_KEYS,
  ...MAINTENANCE_RPC_UPDATE_ID_KEYS,
]);

/** camelCase form / Issue keys → snake_case RPC keys */
export const CAMEL_TO_RPC_KEY: Record<string, string> = {
  vehicleNumber: "vehicle_number",
  vehicleDescription: "vehicle_description",
  deviceDescription: "device_description",
  deviceTickets: "device_tickets",
  softwareVersion: "software_version",
  flespiStatus: "flespi_status",
  screenStatus: "screen_status",
  dotmatrixStatus: "dotmatrix_status",
  sshStatus: "ssh_status",
  pmmSoftware: "pmm_software",
  deviceStatusDescription: "device_status_description",
  motherboardType: "motherboard_type",
  pmmType: "pmm_type",
  hardwareDescription: "hardware_description",
  ssdType: "ssd_type",
  diskHealth: "disk_health",
  powerOnHours: "power_on_hours",
  powerCycles: "power_cycles",
  powerOff: "power_off",
  summarySsd: "summary_ssd",
  storageDescription: "storage_description",
  sataCable: "sata_cable",
  imei: "imei",
  lifetime: "lifetime",
  ssd: "ssd",
  motherboard: "motherboard",
  imeiChanged: "imei_changed",
  simChanged: "sim_changed",
  deviceChanged: "device_changed",
  replacementsDescription: "replacements_description",
  issueType: "issue_type",
  motherboardIssue: "motherboard_issue",
  pmmIssue: "pmm_issue",
  ssdIssue: "ssd_issue",
  otherIssue: "other_issue",
  issueDescription: "issue_description",
  issueSource: "issue_source",
  issueId: "issue_id",
  vehicleId: "vehicle_id",
  deviceId: "device_id",
  deviceStatusId: "device_status_id",
  hardwareId: "hardware_id",
  storageId: "storage_id",
  replacementsId: "replacements_id",
};

export function toRpcKey(key: string): string {
  if (key in CAMEL_TO_RPC_KEY) return CAMEL_TO_RPC_KEY[key];
  return key;
}
