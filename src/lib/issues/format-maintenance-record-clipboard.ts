import type { Issue } from "@/types/issue";
import { hasReplacementChange } from "@/lib/replacements-value-mapper";

type ClipboardField = {
  label: string;
  value: string;
};

type ClipboardSection = {
  title: string;
  fields: ClipboardField[];
};

function formatClipboardDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClipboardText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  const trimmed = value.trim();
  return trimmed === "" ? "N/A" : trimmed;
}

function formatClipboardBool(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return value ? "Yes" : "No";
}

function formatClipboardNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return value.toLocaleString();
}

function formatClipboardStatus(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "N/A";
  const normalized = value.trim().toLowerCase();
  if (normalized === "open") return "Open";
  if (normalized === "resolved") return "Resolved";
  return value.trim();
}

/** IMEI/SIM replacement: real values as-is; no-change / empty → N/A; legacy true → Yes. */
function formatClipboardReplacementChange(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "N/A";
  if (typeof value === "number") return value === 0 ? "N/A" : String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "N/A";
    if (!hasReplacementChange(trimmed)) return "N/A";
    return trimmed;
  }
  return "N/A";
}

function formatAlignedField(label: string, value: string, labelWidth: number): string {
  const pad = label.padEnd(labelWidth, " ");
  const lines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const first = `${pad} : ${lines[0] ?? "N/A"}`;
  if (lines.length <= 1) return first;
  const indent = " ".repeat(labelWidth + 3);
  return [first, ...lines.slice(1).map((line) => `${indent}${line}`)].join("\n");
}

function formatSection(section: ClipboardSection): string {
  const title = section.title.trim();
  const underline = "-".repeat(title.length);
  const labelWidth = Math.max(...section.fields.map((f) => f.label.length), 0);
  const body = section.fields
    .map((f) => formatAlignedField(f.label, f.value, labelWidth))
    .join("\n");
  return `${title}\n${underline}\n${body}`;
}

function buildClipboardSections(record: Issue): ClipboardSection[] {
  return [
    {
      title: "Vehicle Information",
      fields: [
        { label: "Vehicle Number", value: formatClipboardText(record.vehicleNumber) },
        { label: "Vehicle Description", value: formatClipboardText(record.vehicleDescription) },
      ],
    },
    {
      title: "Device Information",
      fields: [
        { label: "IMEI", value: formatClipboardText(record.deviceImei) },
        { label: "Device Description", value: formatClipboardText(record.deviceDescription) },
        { label: "Tickets", value: formatClipboardText(record.deviceTickets) },
      ],
    },
    {
      title: "Device Status",
      fields: [
        { label: "Software Version", value: formatClipboardText(record.softwareVersion) },
        { label: "PMM Software", value: formatClipboardNumber(record.pmmSoftware) },
        { label: "Flespi Status", value: formatClipboardText(record.flespiStatus) },
        { label: "Screen Status", value: formatClipboardText(record.screenStatus) },
        { label: "Dot Matrix Status", value: formatClipboardText(record.dotMatrixStatus) },
        { label: "SSH Status", value: formatClipboardBool(record.sshStatus) },
        { label: "Status Description", value: formatClipboardText(record.deviceStatusDescription) },
      ],
    },
    {
      title: "Hardware",
      fields: [
        { label: "Motherboard Type", value: formatClipboardText(record.motherboardType) },
        { label: "PMM Type", value: formatClipboardText(record.pmmType) },
        { label: "Hardware Description", value: formatClipboardText(record.hardwareDescription) },
      ],
    },
    {
      title: "Storage",
      fields: [
        { label: "SSD Type", value: formatClipboardText(record.ssdType) },
        { label: "Disk Health", value: formatClipboardBool(record.diskHealth) },
        { label: "Power On Hours", value: formatClipboardNumber(record.powerOnHours) },
        { label: "Power Cycles", value: formatClipboardNumber(record.powerCycles) },
        { label: "Power Off Count", value: formatClipboardNumber(record.powerOffCount) },
        { label: "Lifetime", value: formatClipboardNumber(record.lifetime) },
        { label: "Summary SSD", value: formatClipboardText(record.summarySsd) },
        { label: "Storage Description", value: formatClipboardText(record.storageDescription) },
      ],
    },
    {
      title: "Replacements",
      fields: [
        { label: "SSD", value: formatClipboardText(record.ssd) },
        { label: "Motherboard", value: formatClipboardText(record.motherboard) },
        { label: "SATA Cable", value: formatClipboardText(record.sataCable) },
        { label: "Device Changed", value: formatClipboardBool(record.deviceChanged) },
        { label: "IMEI Changed", value: formatClipboardReplacementChange(record.imeiChanged) },
        { label: "SIM Changed", value: formatClipboardReplacementChange(record.simChanged) },
        {
          label: "Replacement Description",
          value: formatClipboardText(record.replacementsDescription),
        },
      ],
    },
    {
      title: "Issue Information",
      fields: [
        { label: "Issue Type", value: formatClipboardText(record.issueType) },
        { label: "Motherboard Issue", value: formatClipboardText(record.motherboardIssue) },
        { label: "PMM Issue", value: formatClipboardText(record.pmmIssue) },
        { label: "SSD Issue", value: formatClipboardText(record.ssdIssue) },
        { label: "Other Issue", value: formatClipboardText(record.otherIssue) },
        { label: "Description", value: formatClipboardText(record.description) },
        { label: "Status", value: formatClipboardStatus(record.status) },
        { label: "Created By", value: formatClipboardText(record.createdByName) },
        { label: "Edited By", value: formatClipboardText(record.editedByName) },
        { label: "Created At", value: formatClipboardDate(record.createdAt) },
        { label: "Updated At", value: formatClipboardDate(record.editedAt) },
        // No separate resolved_* columns on Issue (resolved_by is Edited By)
        { label: "Resolved By", value: "N/A" },
        { label: "Resolved At", value: "N/A" },
      ],
    },
  ];
}

/**
 * Build a plain-text maintenance record report for clipboard paste
 * (WhatsApp, Teams, Outlook, Notepad, Word).
 */
export function formatMaintenanceRecordForClipboard(record: Issue): string {
  const banner = [
    "========================================",
    "Maintenance Record",
    "========================================",
  ].join("\n");

  const sections = buildClipboardSections(record).map(formatSection).join("\n\n");

  return `${banner}\n\n${sections}\n`
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()
    .concat("\n");
}

/** Copy formatted record to the system clipboard. Throws if clipboard access fails. */
export async function copyMaintenanceRecordToClipboard(record: Issue): Promise<void> {
  const text = formatMaintenanceRecordForClipboard(record);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is not available in this browser.");
  }
  await navigator.clipboard.writeText(text);
}
