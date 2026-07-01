import type { Issue } from "@/types/issue";
import type { DataTableColumn } from "@/components/data-table/types";
import { formatDisplayDate, formatCount, sanitizeText } from "@/components/data-table/cells";
import { formatReplacementDbValueForDisplay } from "@/lib/replacements-value-mapper";
import { escapeCsv } from "@/lib/csv";

function cellText(row: Issue, colId: string): string {
  switch (colId) {
    case "vehicleNumber":
      return sanitizeText(row.vehicleNumber);
    case "deviceImei":
      return sanitizeText(row.deviceImei);
    case "deviceTickets":
      return sanitizeText(row.deviceTickets);
    case "softwareVersion":
      return sanitizeText(row.softwareVersion);
    case "flespiStatus":
      return sanitizeText(row.flespiStatus);
    case "screenStatus":
      return sanitizeText(row.screenStatus);
    case "dotMatrixStatus":
      return sanitizeText(row.dotMatrixStatus);
    case "sshStatus":
      return row.sshStatus === null ? "—" : row.sshStatus ? "Yes" : "No";
    case "pmmSoftware":
      return formatCount(row.pmmSoftware);
    case "issueType":
      return sanitizeText(row.issueType);
    case "motherboardIssue":
      return sanitizeText(row.motherboardIssue);
    case "pmmIssue":
      return sanitizeText(row.pmmIssue);
    case "ssdIssue":
      return sanitizeText(row.ssdIssue);
    case "otherIssue":
      return sanitizeText(row.otherIssue);
    case "issueSource":
      return sanitizeText(row.issueSource);
    case "motherboardType":
      return sanitizeText(row.motherboardType);
    case "pmmType":
      return sanitizeText(row.pmmType);
    case "ssdType":
      return sanitizeText(row.ssdType);
    case "diskHealth":
      return row.diskHealth === null ? "—" : row.diskHealth ? "Healthy" : "Unhealthy";
    case "powerOnHours":
      return formatCount(row.powerOnHours);
    case "powerCycles":
      return formatCount(row.powerCycles);
    case "powerOffCount":
      return formatCount(row.powerOffCount);
    case "lifetime":
      return formatCount(row.lifetime);
    case "summarySsd":
      return sanitizeText(row.summarySsd);
    case "ssd":
    case "motherboard":
    case "sataCable":
      return sanitizeText(row[colId as keyof Issue] as string | null);
    case "imeiChanged":
      return formatReplacementDbValueForDisplay(row.imeiChanged);
    case "simChanged":
      return formatReplacementDbValueForDisplay(row.simChanged);
    case "deviceChanged":
      return row.deviceChanged ? "Yes" : "No";
    case "createdAt":
      return formatDisplayDate(row.createdAt);
    case "description":
      return sanitizeText(row.description);
    default:
      return "";
  }
}

export function exportIssuesToCsv(
  rows: Issue[],
  columns: DataTableColumn<Issue>[],
  filename = "issues-export.csv",
): void {
  const exportCols = columns.filter((c) => c.id !== "_rowNum");
  const header = exportCols.map((c) => escapeCsv(c.label)).join(",");
  const body = rows
    .map((row) => exportCols.map((c) => escapeCsv(cellText(row, c.id))).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyIssueRowToClipboard(row: Issue): string {
  const lines = [
    `Vehicle: ${sanitizeText(row.vehicleNumber)}`,
    `IMEI: ${sanitizeText(row.deviceImei)}`,
    `Tickets: ${sanitizeText(row.deviceTickets)}`,
    `Type: ${sanitizeText(row.issueType)}`,
    `Source: ${sanitizeText(row.issueSource)}`,
    `Created: ${formatDisplayDate(row.createdAt)}`,
    `Description: ${sanitizeText(row.description)}`,
  ];
  return lines.join("\n");
}
