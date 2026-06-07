/**
 * Full maintenance record form — maps to vehicles, device, device_status,
 * hardware, storage, replacements, and issues tables (excluding id + created_at).
 */

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

export type MaintenanceRecordFormValues = {
  vehicleNumber: string;
  vehicleDescription: string;
  imei: string;
  deviceDescription: string;
  /** Optional Jira ticket URL or reference (device.tickets) */
  deviceTickets: string;
  softwareVersion: string;
  flespiStatus: string;
  screenStatus: string;
  dotmatrixStatus: string;
  sshStatus: boolean;
  pmmSoftware: number | null;
  deviceStatusDescription: string;
  motherboardType: string;
  pmmType: string;
  hardwareDescription: string;
  ssdType: string;
  diskHealth: boolean;
  powerOnHours: number;
  powerCycles: number;
  powerOff: number;
  lifetime: number;
  summarySsd: string;
  storageDescription: string;
  ssd: ReplacementSsd;
  motherboard: ReplacementMotherboard;
  sataCable: ReplacementSataCable;
  /** null = no change (empty field); string = new IMEI */
  imeiChanged: string | null;
  /** null = no change (empty field); string = new SIM */
  simChanged: string | null;
  deviceChanged: boolean;
  replacementsDescription: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  issueDescription: string;
  issueSource: string;
};

/** Relation IDs required for updating an existing maintenance record — UUID strings only. */
export type MaintenanceRecordRelationIds = {
  issueId: string;
  vehicleId: string;
  deviceId: string;
  deviceStatusId: string | null;
  hardwareId: string | null;
  storageId: string | null;
  replacementsId: string | null;
};

export type MaintenanceRecordCreateInput = MaintenanceRecordFormValues;

export type MaintenanceRecordUpdateInput = MaintenanceRecordFormValues & MaintenanceRecordRelationIds;

export function emptyMaintenanceRecordForm(): MaintenanceRecordFormValues {
  return {
    vehicleNumber: "",
    vehicleDescription: "",
    imei: "",
    deviceDescription: "",
    deviceTickets: "",
    softwareVersion: "",
    flespiStatus: "",
    screenStatus: "",
    dotmatrixStatus: "",
    sshStatus: false,
    pmmSoftware: null,
    deviceStatusDescription: "",
    motherboardType: "",
    pmmType: "",
    hardwareDescription: "",
    ssdType: "",
    diskHealth: false,
    powerOnHours: 0,
    powerCycles: 0,
    powerOff: 0,
    lifetime: 0,
    summarySsd: "",
    storageDescription: "",
    ssd: DEFAULT_REPLACEMENT_SSD,
    motherboard: DEFAULT_REPLACEMENT_MOTHERBOARD,
    sataCable: DEFAULT_REPLACEMENT_SATA_CABLE,
    imeiChanged: null,
    simChanged: null,
    deviceChanged: false,
    replacementsDescription: "",
    issueType: "",
    motherboardIssue: "",
    pmmIssue: "",
    ssdIssue: "",
    otherIssue: "",
    issueDescription: "",
    issueSource: "",
  };
}
