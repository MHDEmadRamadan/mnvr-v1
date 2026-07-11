import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";
import {
  REPLACEMENT_MOTHERBOARD_OPTIONS,
  REPLACEMENT_SATA_CABLE_OPTIONS,
  REPLACEMENT_SSD_OPTIONS,
} from "@/types/replacements";
import type { FormSuggestionFieldName } from "@/lib/form-suggestions/field-map";

export type MaintenanceFormSectionId =
  | "vehicle"
  | "device"
  | "deviceStatus"
  | "hardware"
  | "storage"
  | "replacements"
  | "issue";

export type MaintenanceFormFieldType =
  | "text"
  | "textarea"
  | "combobox"
  | "boolean"
  | "replacement-change"
  | "enum"
  | "int"
  | "float";

export type MaintenanceFormFieldConfig = {
  key: keyof MaintenanceRecordFormValues;
  label: string;
  type: MaintenanceFormFieldType;
  section: MaintenanceFormSectionId;
  required?: boolean;
  /** DB column name for autocomplete suggestions (distinct values query). */
  suggestionField?: FormSuggestionFieldName;
  enumOptions?: readonly string[];
  allowCustom?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  /** Omit from Add/Edit form UI; value still submitted from form state. */
  hidden?: boolean;
  /** Render without a field label (section description provides context). */
  hideLabel?: boolean;
};

export const MAINTENANCE_FORM_SECTIONS: {
  id: MaintenanceFormSectionId;
  title: string;
  description?: string;
  gridClassName: string;
}[] = [
  { id: "vehicle", title: "Vehicle", gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2" },
  { id: "device", title: "Device", gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2" },
  { id: "deviceStatus", title: "Device Status", gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2" },
  {
    id: "issue",
    title: "Issue Information",
    description: "Issue description",
    gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2",
  },
  { id: "hardware", title: "Hardware", gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2" },
  { id: "storage", title: "Storage", gridClassName: "grid grid-cols-1 gap-4 md:grid-cols-2" },
  {
    id: "replacements",
    title: "Replacements",
    gridClassName: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  },
];

export const MAINTENANCE_FORM_FIELDS: MaintenanceFormFieldConfig[] = [
  { key: "vehicleNumber", label: "Vehicle number", type: "text", section: "vehicle", required: true },
  {
    key: "vehicleDescription",
    label: "Vehicle description",
    type: "textarea",
    section: "vehicle",
    className: "md:col-span-2",
    hidden: true,
  },
  {
    key: "imei",
    label: "IMEI",
    type: "text",
    section: "device",
    required: true,
    autoComplete: "off",
  },
  {
    key: "deviceDescription",
    label: "Device description",
    type: "textarea",
    section: "device",
    className: "md:col-span-2",
    hidden: true,
  },
  {
    key: "deviceTickets",
    label: "Tickets (Jira URL or reference)",
    type: "text",
    section: "device",
    className: "md:col-span-2",
  },
  {
    key: "softwareVersion",
    label: "Software version",
    type: "combobox",
    section: "deviceStatus",
    suggestionField: "software_version",
    allowCustom: true,
  },
  {
    key: "flespiStatus",
    label: "Flespi status",
    type: "combobox",
    section: "deviceStatus",
    suggestionField: "flespi_status",
    allowCustom: true,
  },
  {
    key: "screenStatus",
    label: "Screen status",
    type: "combobox",
    section: "deviceStatus",
    suggestionField: "screen_status",
    allowCustom: true,
  },
  {
    key: "dotmatrixStatus",
    label: "Dotmatrix status",
    type: "combobox",
    section: "deviceStatus",
    suggestionField: "dotmatrix_status",
    allowCustom: true,
  },
  { key: "pmmSoftware", label: "PMM software", type: "float", section: "deviceStatus" },
  { key: "sshStatus", label: "SSH status", type: "boolean", section: "deviceStatus" },
  {
    key: "deviceStatusDescription",
    label: "Description",
    type: "textarea",
    section: "deviceStatus",
    className: "md:col-span-2",
    hidden: true,
  },
  {
    key: "motherboardType",
    label: "Motherboard type",
    type: "combobox",
    section: "hardware",
    suggestionField: "motherboard_type",
    allowCustom: true,
  },
  {
    key: "pmmType",
    label: "PMM type",
    type: "combobox",
    section: "hardware",
    suggestionField: "pmm_type",
    allowCustom: true,
  },
  {
    key: "hardwareDescription",
    label: "Hardware description",
    type: "textarea",
    section: "hardware",
    className: "md:col-span-2",
    hidden: true,
  },
  {
    key: "ssdType",
    label: "SSD type",
    type: "combobox",
    section: "storage",
    suggestionField: "ssd_type",
    allowCustom: true,
  },
  { key: "diskHealth", label: "Disk health", type: "boolean", section: "storage" },
  { key: "powerOnHours", label: "Power on hours", type: "int", section: "storage" },
  { key: "powerCycles", label: "Power cycles", type: "int", section: "storage" },
  { key: "powerOff", label: "Power off", type: "int", section: "storage" },
  { key: "lifetime", label: "Lifetime", type: "int", section: "storage" },
  {
    key: "summarySsd",
    label: "Summary SSD",
    type: "textarea",
    section: "storage",
    className: "md:col-span-2",
  },
  {
    key: "storageDescription",
    label: "Storage description",
    type: "textarea",
    section: "storage",
    className: "md:col-span-2",
    hidden: true,
  },
  {
    key: "ssd",
    label: "SSD replacement",
    type: "enum",
    section: "replacements",
    enumOptions: REPLACEMENT_SSD_OPTIONS,
  },
  {
    key: "motherboard",
    label: "Motherboard replacement",
    type: "enum",
    section: "replacements",
    enumOptions: REPLACEMENT_MOTHERBOARD_OPTIONS,
  },
  {
    key: "sataCable",
    label: "SATA cable",
    type: "enum",
    section: "replacements",
    enumOptions: REPLACEMENT_SATA_CABLE_OPTIONS,
  },
  {
    key: "imeiChanged",
    label: "IMEI changed",
    type: "replacement-change",
    section: "replacements",
    placeholder: "New IMEI",
  },
  {
    key: "simChanged",
    label: "SIM changed",
    type: "replacement-change",
    section: "replacements",
    placeholder: "New SIM",
  },
  { key: "deviceChanged", label: "Device changed", type: "boolean", section: "replacements" },
  {
    key: "replacementsDescription",
    label: "Replacements description",
    type: "textarea",
    section: "replacements",
    className: "sm:col-span-2 lg:col-span-3",
    hidden: true,
  },
  {
    key: "issueType",
    label: "Issue type",
    type: "combobox",
    section: "issue",
    suggestionField: "issue_type",
    allowCustom: true,
    required: true,
  },
  {
    key: "motherboardIssue",
    label: "Motherboard issue",
    type: "combobox",
    section: "issue",
    suggestionField: "motherboard_issue",
    allowCustom: true,
  },
  {
    key: "pmmIssue",
    label: "PMM issue",
    type: "combobox",
    section: "issue",
    suggestionField: "pmm_issue",
    allowCustom: true,
  },
  {
    key: "ssdIssue",
    label: "SSD issue",
    type: "combobox",
    section: "issue",
    suggestionField: "ssd_issue",
    allowCustom: true,
  },
  {
    key: "otherIssue",
    label: "Other issue",
    type: "combobox",
    section: "issue",
    suggestionField: "other_issue",
    allowCustom: true,
  },
  {
    key: "issueDescription",
    label: "Description",
    type: "textarea",
    section: "issue",
    className: "md:col-span-2",
  },
];

export function fieldsForSection(section: MaintenanceFormSectionId): MaintenanceFormFieldConfig[] {
  return MAINTENANCE_FORM_FIELDS.filter((f) => f.section === section && !f.hidden);
}

export const COMBOBOX_FORM_FIELDS = MAINTENANCE_FORM_FIELDS.filter((f) => f.type === "combobox");
