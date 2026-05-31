import type { Issue } from "@/types/issue";

/** Fields included in global table search (display values only — no internal IDs). */
const SEARCH_KEYS: (keyof Issue)[] = [
  "vehicleNumber",
  "deviceImei",
  "softwareVersion",
  "flespiStatus",
  "screenStatus",
  "dotMatrixStatus",
  "issueType",
  "motherboardIssue",
  "pmmIssue",
  "ssdIssue",
  "otherIssue",
  "issueSource",
  "motherboardType",
  "pmmType",
  "ssdType",
  "summarySsd",
  "description",
];

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

export function issueMatchesGlobalSearch(row: Issue, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = SEARCH_KEYS.map((k) => displayValue(row[k])).join(" ").toLowerCase();
  return haystack.includes(q);
}
