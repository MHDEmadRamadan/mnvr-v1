import type { ReportFilters } from "@/types/reports";

export function defaultReportFilters(): ReportFilters {
  return {
    vehicleNumber: "",
    deviceImei: "",
    issueType: "",
    motherboardIssue: "",
    pmmIssue: "",
    ssdIssue: "",
    otherIssue: "",
    motherboardType: "",
    pmmType: "",
    ssdType: "",
    softwareVersion: "",
    flespiStatus: "",
    screenStatus: "",
    dotmatrixStatus: "",
    sshStatus: "",
    ssd: "",
    motherboard: "",
    sataCable: "",
    imeiChanged: "",
    simChanged: "",
    deviceChanged: "",
    createdFrom: "",
    createdTo: "",
  };
}

export function hasActiveReportFilters(filters: ReportFilters): boolean {
  return Object.values(filters).some((v) => String(v).trim() !== "");
}

export function parseReportFilters(raw: string | null): ReportFilters {
  if (!raw) return defaultReportFilters();
  try {
    const parsed = JSON.parse(raw) as Partial<ReportFilters>;
    return { ...defaultReportFilters(), ...parsed };
  } catch {
    return defaultReportFilters();
  }
}

export function serializeReportFilters(filters: ReportFilters): string {
  return JSON.stringify(filters);
}

function boolFilterActive(value: ReportFilters[keyof ReportFilters]): boolean {
  return value === "true" || value === "false";
}

function textActive(value: string): boolean {
  return value.trim().length > 0;
}

export function reportFilterSummary(filters: ReportFilters): string[] {
  const parts: string[] = [];
  if (textActive(filters.vehicleNumber)) parts.push(`Vehicle: ${filters.vehicleNumber.trim()}`);
  if (textActive(filters.deviceImei)) parts.push(`IMEI: ${filters.deviceImei.trim()}`);
  if (textActive(filters.issueType)) parts.push(`Issue type: ${filters.issueType.trim()}`);
  if (textActive(filters.motherboardIssue)) parts.push(`Motherboard issue: ${filters.motherboardIssue.trim()}`);
  if (textActive(filters.pmmIssue)) parts.push(`PMM issue: ${filters.pmmIssue.trim()}`);
  if (textActive(filters.ssdIssue)) parts.push(`SSD issue: ${filters.ssdIssue.trim()}`);
  if (textActive(filters.otherIssue)) parts.push(`Other issue: ${filters.otherIssue.trim()}`);
  if (textActive(filters.motherboardType)) parts.push(`Motherboard type: ${filters.motherboardType.trim()}`);
  if (textActive(filters.pmmType)) parts.push(`PMM type: ${filters.pmmType.trim()}`);
  if (textActive(filters.ssdType)) parts.push(`SSD type: ${filters.ssdType.trim()}`);
  if (textActive(filters.softwareVersion)) parts.push(`Software: ${filters.softwareVersion.trim()}`);
  if (textActive(filters.flespiStatus)) parts.push(`Flespi: ${filters.flespiStatus.trim()}`);
  if (textActive(filters.screenStatus)) parts.push(`Screen: ${filters.screenStatus.trim()}`);
  if (textActive(filters.dotmatrixStatus)) parts.push(`Dotmatrix: ${filters.dotmatrixStatus.trim()}`);
  if (boolFilterActive(filters.sshStatus)) parts.push(`SSH: ${filters.sshStatus}`);
  if (textActive(filters.ssd)) parts.push(`SSD replacement: ${filters.ssd}`);
  if (textActive(filters.motherboard)) parts.push(`Motherboard replacement: ${filters.motherboard}`);
  if (textActive(filters.sataCable)) parts.push(`SATA cable: ${filters.sataCable}`);
  if (textActive(filters.imeiChanged)) parts.push(`IMEI changed: ${filters.imeiChanged.trim()}`);
  if (textActive(filters.simChanged)) parts.push(`SIM changed: ${filters.simChanged.trim()}`);
  if (boolFilterActive(filters.deviceChanged)) parts.push(`Device changed: ${filters.deviceChanged}`);
  if (filters.createdFrom) parts.push(`From: ${filters.createdFrom}`);
  if (filters.createdTo) parts.push(`To: ${filters.createdTo}`);
  return parts;
}
