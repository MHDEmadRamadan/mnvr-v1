import * as XLSX from "xlsx";
import type { Issue } from "@/types/issue";
import type { ReportExportFormat } from "@/types/reports";
import { formatDisplayDate, sanitizeText } from "@/lib/format";
import { REPORT_EXPORT_COLUMNS } from "@/config/reports-table-config";
import { formatReplacementDbValueForDisplay } from "@/lib/replacements-value-mapper";
import { escapeCsv } from "@/lib/csv";

function boolText(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

function rowToRecord(row: Issue): Record<string, string | number> {
  return {
    Vehicle: sanitizeText(row.vehicleNumber),
    IMEI: sanitizeText(row.deviceImei),
    Tickets: sanitizeText(row.deviceTickets),
    "Issue Type": sanitizeText(row.issueType),
    "Motherboard Issue": sanitizeText(row.motherboardIssue),
    "PMM Issue": sanitizeText(row.pmmIssue),
    "SSD Issue": sanitizeText(row.ssdIssue),
    "Other Issue": sanitizeText(row.otherIssue),
    Source: sanitizeText(row.issueSource),
    "Motherboard Type": sanitizeText(row.motherboardType),
    "PMM Type": sanitizeText(row.pmmType),
    "SSD Type": sanitizeText(row.ssdType),
    Software: sanitizeText(row.softwareVersion),
    Flespi: sanitizeText(row.flespiStatus),
    Screen: sanitizeText(row.screenStatus),
    Dotmatrix: sanitizeText(row.dotMatrixStatus),
    SSH: boolText(row.sshStatus),
    "SSD Replacement": sanitizeText(row.ssd),
    "Motherboard Replacement": sanitizeText(row.motherboard),
    "SATA Cable": sanitizeText(row.sataCable),
    "IMEI Changed": formatReplacementDbValueForDisplay(row.imeiChanged),
    "SIM Changed": formatReplacementDbValueForDisplay(row.simChanged),
    "Device Changed": boolText(row.deviceChanged),
    pmm_software: row.pmmSoftware ?? "",
    Description: sanitizeText(row.description),
    Created: formatDisplayDate(row.createdAt),
  };
}

function buildCsv(rows: Issue[]): Buffer {
  const headers = REPORT_EXPORT_COLUMNS.map((c) => c.label);
  const headerLine = headers.map(escapeCsv).join(",");
  const body = rows
    .map((row) => {
      const record = rowToRecord(row);
      return headers.map((h) => escapeCsv(String(record[h] ?? ""))).join(",");
    })
    .join("\n");
  return Buffer.from(`${headerLine}\n${body}`, "utf-8");
}

function buildXlsx(rows: Issue[]): Buffer {
  const data = rows.map(rowToRecord);
  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Issues Report");
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}

export function buildReportExportBuffer(
  rows: Issue[],
  format: ReportExportFormat,
): { buffer: Buffer; filename: string; contentType: string } {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "xlsx") {
    return {
      buffer: buildXlsx(rows),
      filename: `issues-report-${stamp}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  return {
    buffer: buildCsv(rows),
    filename: `issues-report-${stamp}.csv`,
    contentType: "text/csv; charset=utf-8",
  };
}
