import type { Issue } from "@/types/issue";
import type { ReportBreakdownItem, ReportMetrics } from "@/types/reports";
import { isReplacementActive } from "@/types/replacements";
import { hasReplacementChange } from "@/lib/replacements-value-mapper";

const TOP_N = 8;

function countBy(rows: Issue[], accessor: (row: Issue) => string | null | undefined): ReportBreakdownItem[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = accessor(row);
    const label = raw?.trim() ? raw.trim() : "(empty)";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key: string): string {
  if (key === "Unknown") return key;
  const [y, m] = key.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m ?? "1", 10) - 1;
  return `${monthNames[idx] ?? m} ${y}`;
}

function topFailures(rows: Issue[]): ReportBreakdownItem[] {
  const fields: { label: string; accessor: (r: Issue) => string }[] = [
    { label: "Motherboard issue", accessor: (r) => r.motherboardIssue },
    { label: "PMM issue", accessor: (r) => r.pmmIssue },
    { label: "SSD issue", accessor: (r) => r.ssdIssue },
    { label: "Other issue", accessor: (r) => r.otherIssue },
    { label: "Issue type", accessor: (r) => r.issueType },
  ];

  const map = new Map<string, number>();
  for (const row of rows) {
    for (const field of fields) {
      const value = field.accessor(row).trim();
      if (!value) continue;
      const key = `${field.label}: ${value}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

function topReplacements(rows: Issue[]): ReportBreakdownItem[] {
  const flags: { label: string; accessor: (r: Issue) => boolean }[] = [
    { label: "SSD replacement", accessor: (r) => isReplacementActive(r.ssd) },
    { label: "Motherboard replacement", accessor: (r) => isReplacementActive(r.motherboard) },
    { label: "SATA cable replacement", accessor: (r) => isReplacementActive(r.sataCable) },
    { label: "IMEI changed", accessor: (r) => hasReplacementChange(r.imeiChanged) },
    { label: "SIM changed", accessor: (r) => hasReplacementChange(r.simChanged) },
    { label: "Device changed", accessor: (r) => r.deviceChanged === true },
  ];

  return flags
    .map(({ label, accessor }) => ({
      label,
      count: rows.filter((r) => accessor(r)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function computeReportMetrics(rows: Issue[]): ReportMetrics {
  const monthlyMap = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
  }

  const monthlyTrends = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, count]) => ({ label: formatMonth(key), count }));

  return {
    totalIssues: rows.length,
    byIssueType: countBy(rows, (r) => r.issueType).slice(0, TOP_N),
    byMotherboardType: countBy(rows, (r) => r.motherboardType).slice(0, TOP_N),
    byPmmType: countBy(rows, (r) => r.pmmType).slice(0, TOP_N),
    bySsdType: countBy(rows, (r) => r.ssdType).slice(0, TOP_N),
    bySource: countBy(rows, (r) => r.issueSource).slice(0, TOP_N),
    topFailures: topFailures(rows),
    topReplacements: topReplacements(rows),
    monthlyTrends,
  };
}

export function breakdownMax(items: ReportBreakdownItem[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.count), 1);
}
