/**
 * Issues filter catalog — schema columns only, primary bar + Advanced sections.
 */

import type { FormSuggestionFieldName } from "@/lib/form-suggestions/field-map";
import {
  REPLACEMENT_MOTHERBOARD_OPTIONS,
  REPLACEMENT_SATA_CABLE_OPTIONS,
  REPLACEMENT_SSD_OPTIONS,
} from "@/types/replacements";

export type IssueFilterCategory =
  | "primary"
  | "vehicle"
  | "device"
  | "deviceStatus"
  | "hardware"
  | "storage"
  | "replacements"
  | "issueInfo";

export type IssueFilterControlType =
  | "text"
  | "multiAutocomplete"
  | "enum"
  | "boolean"
  | "status"
  | "date"
  | "numericRange"
  | "triStateText";

export type IssueFilterFieldId =
  | "globalSearch"
  | "date"
  | "vehicleNumber"
  | "deviceImei"
  | "issueType"
  | "vehicleDescription"
  | "deviceTickets"
  | "deviceDescription"
  | "softwareVersion"
  | "pmmSoftware"
  | "flespiStatus"
  | "screenStatus"
  | "dotmatrixStatus"
  | "sshStatus"
  | "motherboardType"
  | "pmmType"
  | "ssdType"
  | "diskHealth"
  | "lifetime"
  | "powerOnHours"
  | "powerCycles"
  | "powerOffCount"
  | "ssd"
  | "motherboard"
  | "sataCable"
  | "deviceChanged"
  | "imeiChanged"
  | "simChanged"
  | "motherboardIssue"
  | "pmmIssue"
  | "ssdIssue"
  | "otherIssue";

export type IssueFilterFieldDef = {
  id: IssueFilterFieldId;
  label: string;
  category: IssueFilterCategory;
  control: IssueFilterControlType;
  primary?: boolean;
  advanced?: boolean;
  suggestionField?: FormSuggestionFieldName;
  enumOptions?: readonly string[];
  stateKeys: readonly string[];
};

/** State keys that hold string[] (multi-select OR within field; fields OR across filters). */
export const MULTI_VALUE_FILTER_KEYS = [
  "vehicleNumber",
  "deviceImei",
  "issueType",
  "vehicleDescription",
  "deviceTickets",
  "deviceDescription",
  "softwareVersion",
  "pmmSoftware",
  "motherboardType",
  "pmmType",
  "ssdType",
  "motherboardIssue",
  "pmmIssue",
  "ssdIssue",
  "otherIssue",
  "description",
  "flespiStatus",
  "screenStatus",
  "dotmatrixStatus",
  "summarySsd",
  "storageDescription",
  "hardwareDescription",
  "replacementsDescription",
  "deviceStatusDescription",
] as const;

export const ISSUE_FILTER_CATEGORY_LABELS: Record<IssueFilterCategory, string> = {
  primary: "Primary",
  vehicle: "Vehicle",
  device: "Device",
  deviceStatus: "Device Status",
  hardware: "Hardware",
  storage: "Storage",
  replacements: "Replacements",
  issueInfo: "Issue Information",
};

export const ISSUE_FILTER_CATEGORY_ORDER: IssueFilterCategory[] = [
  "vehicle",
  "device",
  "deviceStatus",
  "hardware",
  "storage",
  "replacements",
  "issueInfo",
];

export const ISSUE_FILTER_FIELDS: readonly IssueFilterFieldDef[] = [
  {
    id: "globalSearch",
    label: "Search",
    category: "primary",
    control: "text",
    primary: true,
    stateKeys: ["globalSearch"],
  },
  {
    id: "date",
    label: "Date",
    category: "primary",
    control: "date",
    primary: true,
    stateKeys: ["dateMode", "fromDate", "toDate"],
  },
  {
    id: "vehicleNumber",
    label: "Vehicle Number",
    category: "primary",
    control: "multiAutocomplete",
    primary: true,
    suggestionField: "vehicle_number",
    stateKeys: ["vehicleNumber"],
  },
  {
    id: "deviceImei",
    label: "IMEI",
    category: "primary",
    control: "multiAutocomplete",
    primary: true,
    suggestionField: "imei",
    stateKeys: ["deviceImei"],
  },
  {
    id: "issueType",
    label: "Issue Type",
    category: "primary",
    control: "multiAutocomplete",
    primary: true,
    suggestionField: "issue_type",
    stateKeys: ["issueType"],
  },

  // Advanced — Vehicle
  {
    id: "vehicleDescription",
    label: "Vehicle Description",
    category: "vehicle",
    control: "multiAutocomplete",
    advanced: true,
    stateKeys: ["vehicleDescription"],
  },

  // Device
  {
    id: "deviceTickets",
    label: "Tickets",
    category: "device",
    control: "multiAutocomplete",
    advanced: true,
    stateKeys: ["deviceTickets"],
  },
  {
    id: "deviceDescription",
    label: "Device Description",
    category: "device",
    control: "multiAutocomplete",
    advanced: true,
    stateKeys: ["deviceDescription"],
  },

  // Device Status
  {
    id: "softwareVersion",
    label: "Software Version",
    category: "deviceStatus",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "software_version",
    stateKeys: ["softwareVersion"],
  },
  {
    id: "pmmSoftware",
    label: "PMM Software",
    category: "deviceStatus",
    control: "multiAutocomplete",
    advanced: true,
    stateKeys: ["pmmSoftware"],
  },
  {
    id: "flespiStatus",
    label: "Flespi Status",
    category: "deviceStatus",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "flespi_status",
    stateKeys: ["flespiStatus"],
  },
  {
    id: "screenStatus",
    label: "Screen Status",
    category: "deviceStatus",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "screen_status",
    stateKeys: ["screenStatus"],
  },
  {
    id: "dotmatrixStatus",
    label: "Dot Matrix Status",
    category: "deviceStatus",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "dotmatrix_status",
    stateKeys: ["dotmatrixStatus"],
  },
  {
    id: "sshStatus",
    label: "SSH Status",
    category: "deviceStatus",
    control: "boolean",
    advanced: true,
    stateKeys: ["sshStatus"],
  },

  // Hardware
  {
    id: "motherboardType",
    label: "Motherboard Type",
    category: "hardware",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "motherboard_type",
    stateKeys: ["motherboardType"],
  },
  {
    id: "pmmType",
    label: "PMM Type",
    category: "hardware",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "pmm_type",
    stateKeys: ["pmmType"],
  },

  // Storage
  {
    id: "ssdType",
    label: "SSD Type",
    category: "storage",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "ssd_type",
    stateKeys: ["ssdType"],
  },
  {
    id: "diskHealth",
    label: "Disk Health",
    category: "storage",
    control: "boolean",
    advanced: true,
    stateKeys: ["diskHealth"],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    category: "storage",
    control: "numericRange",
    advanced: true,
    stateKeys: ["lifetimeMin", "lifetimeMax"],
  },
  {
    id: "powerOnHours",
    label: "Power On Hours",
    category: "storage",
    control: "numericRange",
    advanced: true,
    stateKeys: ["powerOnHoursMin", "powerOnHoursMax"],
  },
  {
    id: "powerCycles",
    label: "Power Cycles",
    category: "storage",
    control: "numericRange",
    advanced: true,
    stateKeys: ["powerCyclesMin", "powerCyclesMax"],
  },
  {
    id: "powerOffCount",
    label: "Power Off Count",
    category: "storage",
    control: "numericRange",
    advanced: true,
    stateKeys: ["powerOffCountMin", "powerOffCountMax"],
  },

  // Replacements
  {
    id: "ssd",
    label: "SSD",
    category: "replacements",
    control: "enum",
    advanced: true,
    enumOptions: REPLACEMENT_SSD_OPTIONS,
    stateKeys: ["ssd"],
  },
  {
    id: "motherboard",
    label: "Motherboard",
    category: "replacements",
    control: "enum",
    advanced: true,
    enumOptions: REPLACEMENT_MOTHERBOARD_OPTIONS,
    stateKeys: ["motherboard"],
  },
  {
    id: "sataCable",
    label: "SATA Cable",
    category: "replacements",
    control: "enum",
    advanced: true,
    enumOptions: REPLACEMENT_SATA_CABLE_OPTIONS,
    stateKeys: ["sataCable"],
  },
  {
    id: "deviceChanged",
    label: "Device Changed",
    category: "replacements",
    control: "boolean",
    advanced: true,
    stateKeys: ["deviceChanged"],
  },
  {
    id: "imeiChanged",
    label: "IMEI Changed",
    category: "replacements",
    control: "triStateText",
    advanced: true,
    stateKeys: ["imeiChanged"],
  },
  {
    id: "simChanged",
    label: "SIM Changed",
    category: "replacements",
    control: "triStateText",
    advanced: true,
    stateKeys: ["simChanged"],
  },

  // Issue Information
  {
    id: "motherboardIssue",
    label: "Motherboard Issue",
    category: "issueInfo",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "motherboard_issue",
    stateKeys: ["motherboardIssue"],
  },
  {
    id: "pmmIssue",
    label: "PMM Issue",
    category: "issueInfo",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "pmm_issue",
    stateKeys: ["pmmIssue"],
  },
  {
    id: "ssdIssue",
    label: "SSD Issue",
    category: "issueInfo",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "ssd_issue",
    stateKeys: ["ssdIssue"],
  },
  {
    id: "otherIssue",
    label: "Other Issue",
    category: "issueInfo",
    control: "multiAutocomplete",
    advanced: true,
    suggestionField: "other_issue",
    stateKeys: ["otherIssue"],
  },
] as const;

const FIELD_BY_ID = new Map(ISSUE_FILTER_FIELDS.map((f) => [f.id, f]));

export function getIssueFilterField(id: IssueFilterFieldId): IssueFilterFieldDef | undefined {
  return FIELD_BY_ID.get(id);
}

export const PRIMARY_ISSUE_FILTER_IDS = ISSUE_FILTER_FIELDS.filter((f) => f.primary).map((f) => f.id);

export const ADVANCED_ISSUE_FILTER_FIELDS = ISSUE_FILTER_FIELDS.filter((f) => f.advanced);

/** @deprecated Prefer ADVANCED_ISSUE_FILTER_FIELDS */
export const ADDABLE_ISSUE_FILTER_FIELDS = ADVANCED_ISSUE_FILTER_FIELDS;
