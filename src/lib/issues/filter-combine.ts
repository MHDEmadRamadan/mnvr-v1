import type { IssueQueryFilters, TextFilterValue } from "@/types/issue";
import { normalizeTextFilterValues } from "@/lib/issues/filter-rpc";

/**
 * Active filter keys that participate in cross-field OR matching.
 * Empty / unset filters are omitted (they must not AND-restrict results).
 */
export type ActiveIssueFilterClause =
  | { kind: "text"; key: string; values: string[] }
  | { kind: "exact"; key: string; value: string | boolean | number }
  | { kind: "range"; key: string; min?: number | string; max?: number | string }
  | { kind: "globalSearch"; value: string };

function textValues(value: TextFilterValue | undefined): string[] {
  return normalizeTextFilterValues(value);
}

/**
 * Build the logical OR clauses implied by IssueQueryFilters.
 * Within a multi-value text clause, values are OR'd (IN / any-match).
 * Across clauses, combination is OR (not AND).
 */
export function buildOrFilterClauses(filters: IssueQueryFilters): ActiveIssueFilterClause[] {
  const clauses: ActiveIssueFilterClause[] = [];

  const pushText = (key: keyof IssueQueryFilters, value: TextFilterValue | undefined) => {
    const values = textValues(value);
    if (values.length) clauses.push({ kind: "text", key, values });
  };

  if (filters.globalSearch?.trim()) {
    clauses.push({ kind: "globalSearch", value: filters.globalSearch.trim() });
  }
  if (filters.status?.trim()) {
    clauses.push({ kind: "exact", key: "status", value: filters.status.trim() });
  }

  pushText("issueType", filters.issueType);
  pushText("motherboardIssue", filters.motherboardIssue);
  pushText("pmmIssue", filters.pmmIssue);
  pushText("ssdIssue", filters.ssdIssue);
  pushText("otherIssue", filters.otherIssue);
  pushText("description", filters.description);
  pushText("deviceImei", filters.deviceImei);
  pushText("deviceTickets", filters.deviceTickets);
  pushText("deviceDescription", filters.deviceDescription);
  pushText("vehicleNumber", filters.vehicleNumber);
  pushText("vehicleDescription", filters.vehicleDescription);
  pushText("softwareVersion", filters.softwareVersion);
  pushText("pmmSoftware", filters.pmmSoftware);
  pushText("flespiStatus", filters.flespiStatus);
  pushText("screenStatus", filters.screenStatus);
  pushText("dotmatrixStatus", filters.dotmatrixStatus);
  pushText("deviceStatusDescription", filters.deviceStatusDescription);
  pushText("motherboardType", filters.motherboardType);
  pushText("pmmType", filters.pmmType);
  pushText("hardwareDescription", filters.hardwareDescription);
  pushText("ssdType", filters.ssdType);
  pushText("summarySsd", filters.summarySsd);
  pushText("storageDescription", filters.storageDescription);
  pushText("replacementsDescription", filters.replacementsDescription);

  if (filters.ssd?.trim()) clauses.push({ kind: "exact", key: "ssd", value: filters.ssd.trim() });
  if (filters.motherboard?.trim()) {
    clauses.push({ kind: "exact", key: "motherboard", value: filters.motherboard.trim() });
  }
  if (filters.sataCable?.trim()) {
    clauses.push({ kind: "exact", key: "sataCable", value: filters.sataCable.trim() });
  }
  if (filters.imeiChanged?.trim()) {
    clauses.push({ kind: "exact", key: "imeiChanged", value: filters.imeiChanged.trim() });
  }
  if (filters.simChanged?.trim()) {
    clauses.push({ kind: "exact", key: "simChanged", value: filters.simChanged.trim() });
  }
  if (filters.createdBy?.trim()) {
    clauses.push({ kind: "exact", key: "createdBy", value: filters.createdBy.trim() });
  }
  if (filters.editedBy?.trim()) {
    clauses.push({ kind: "exact", key: "editedBy", value: filters.editedBy.trim() });
  }

  if (filters.sshStatus === true || filters.sshStatus === false) {
    clauses.push({ kind: "exact", key: "sshStatus", value: filters.sshStatus });
  }
  if (filters.diskHealth === true || filters.diskHealth === false) {
    clauses.push({ kind: "exact", key: "diskHealth", value: filters.diskHealth });
  }
  if (filters.deviceChanged === true || filters.deviceChanged === false) {
    clauses.push({ kind: "exact", key: "deviceChanged", value: filters.deviceChanged });
  }

  if (filters.powerOnHoursMin != null || filters.powerOnHoursMax != null) {
    clauses.push({
      kind: "range",
      key: "powerOnHours",
      min: filters.powerOnHoursMin,
      max: filters.powerOnHoursMax,
    });
  }
  if (filters.powerCyclesMin != null || filters.powerCyclesMax != null) {
    clauses.push({
      kind: "range",
      key: "powerCycles",
      min: filters.powerCyclesMin,
      max: filters.powerCyclesMax,
    });
  }
  if (filters.powerOffCountMin != null || filters.powerOffCountMax != null) {
    clauses.push({
      kind: "range",
      key: "powerOffCount",
      min: filters.powerOffCountMin,
      max: filters.powerOffCountMax,
    });
  }
  if (filters.lifetimeMin != null || filters.lifetimeMax != null) {
    clauses.push({
      kind: "range",
      key: "lifetime",
      min: filters.lifetimeMin,
      max: filters.lifetimeMax,
    });
  }

  if (filters.createdFrom?.trim() || filters.createdTo?.trim()) {
    clauses.push({
      kind: "range",
      key: "createdAt",
      min: filters.createdFrom?.trim() || undefined,
      max: filters.createdTo?.trim() || undefined,
    });
  }

  return clauses;
}

/** Human-readable OR expression for regression assertions. */
export function describeOrFilterExpression(filters: IssueQueryFilters): string {
  const clauses = buildOrFilterClauses(filters);
  if (clauses.length === 0) return "(no active filters)";
  return clauses
    .map((c) => {
      if (c.kind === "text") {
        return c.values.length === 1
          ? `${c.key}=${c.values[0]}`
          : `(${c.values.map((v) => `${c.key}=${v}`).join(" OR ")})`;
      }
      if (c.kind === "exact") return `${c.key}=${String(c.value)}`;
      if (c.kind === "globalSearch") return `globalSearch=${c.value}`;
      const parts = [
        c.min != null ? `${c.key}>=${c.min}` : null,
        c.max != null ? `${c.key}<=${c.max}` : null,
      ].filter(Boolean);
      return `(${parts.join(" AND ")})`;
    })
    .join(" OR ");
}
