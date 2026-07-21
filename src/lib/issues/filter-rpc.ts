import type { IssueQueryFilters, IssueSort, TextFilterValue } from "@/types/issue";
import type { ReportFilters } from "@/types/reports";

/** JSON payload accepted by `page_filtered_issues` / `count_filtered_issues`. */
export type IssueFilterRpcPayload = Record<string, string | boolean | number | string[]>;

const SORT_KEY_TO_SQL: Record<string, string> = {
  createdAt: "created_at",
  editedAt: "edited_at",
  issueType: "issue_type",
  motherboardIssue: "motherboard_issue",
  pmmIssue: "pmm_issue",
  ssdIssue: "ssd_issue",
  otherIssue: "other_issue",
  description: "description",
  deviceImei: "imei",
  deviceTickets: "tickets",
  vehicleNumber: "vehicle_number",
  flespiStatus: "flespi_status",
  screenStatus: "screen_status",
};

export function resolveFilterSort(sort: IssueSort): { sortKey: string; ascending: boolean } {
  return {
    sortKey: SORT_KEY_TO_SQL[sort.key] ?? "created_at",
    ascending: sort.direction === "asc",
  };
}

export function normalizeTextFilterValues(value: TextFilterValue | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => v.trim()).filter(Boolean))];
  }
  const trimmed = value.trim();
  return trimmed ? [trimmed] : [];
}

function setTextOrMulti(
  out: IssueFilterRpcPayload,
  key: string,
  value: TextFilterValue | undefined,
) {
  const values = normalizeTextFilterValues(value);
  if (values.length === 0) return;
  out[key] = values.length === 1 ? values[0] : values;
}

/** Serialize IssueQueryFilters for the Postgres RPC (omit empty values). */
export function issueQueryFiltersToRpcPayload(
  filters: IssueQueryFilters,
  extras?: { criticalOnly?: boolean },
): IssueFilterRpcPayload {
  const out: IssueFilterRpcPayload = {};

  const setText = (key: string, value: string | undefined) => {
    if (value?.trim()) out[key] = value.trim();
  };
  const setBool = (key: string, value: boolean | undefined) => {
    if (value === true || value === false) out[key] = value;
  };
  const setNum = (key: string, value: number | undefined) => {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  };

  setText("globalSearch", filters.globalSearch);
  setText("status", filters.status);
  setTextOrMulti(out, "issueType", filters.issueType);
  setTextOrMulti(out, "motherboardIssue", filters.motherboardIssue);
  setTextOrMulti(out, "pmmIssue", filters.pmmIssue);
  setTextOrMulti(out, "ssdIssue", filters.ssdIssue);
  setTextOrMulti(out, "otherIssue", filters.otherIssue);
  setTextOrMulti(out, "description", filters.description);
  setTextOrMulti(out, "deviceImei", filters.deviceImei);
  setTextOrMulti(out, "deviceTickets", filters.deviceTickets);
  setTextOrMulti(out, "deviceDescription", filters.deviceDescription);
  setTextOrMulti(out, "vehicleNumber", filters.vehicleNumber);
  setTextOrMulti(out, "vehicleDescription", filters.vehicleDescription);
  setTextOrMulti(out, "softwareVersion", filters.softwareVersion);
  setTextOrMulti(out, "pmmSoftware", filters.pmmSoftware);
  setTextOrMulti(out, "flespiStatus", filters.flespiStatus);
  setTextOrMulti(out, "screenStatus", filters.screenStatus);
  setTextOrMulti(out, "dotmatrixStatus", filters.dotmatrixStatus);
  setTextOrMulti(out, "deviceStatusDescription", filters.deviceStatusDescription);
  setTextOrMulti(out, "motherboardType", filters.motherboardType);
  setTextOrMulti(out, "pmmType", filters.pmmType);
  setTextOrMulti(out, "hardwareDescription", filters.hardwareDescription);
  setTextOrMulti(out, "ssdType", filters.ssdType);
  setTextOrMulti(out, "summarySsd", filters.summarySsd);
  setTextOrMulti(out, "storageDescription", filters.storageDescription);
  setText("ssd", filters.ssd);
  setText("motherboard", filters.motherboard);
  setText("sataCable", filters.sataCable);
  setText("imeiChanged", filters.imeiChanged);
  setText("simChanged", filters.simChanged);
  setTextOrMulti(out, "replacementsDescription", filters.replacementsDescription);
  setText("createdBy", filters.createdBy);
  setText("editedBy", filters.editedBy);
  setText("createdFrom", filters.createdFrom);
  setText("createdTo", filters.createdTo);

  setBool("sshStatus", filters.sshStatus);
  setBool("diskHealth", filters.diskHealth);
  setBool("deviceChanged", filters.deviceChanged);

  setNum("powerOnHoursMin", filters.powerOnHoursMin);
  setNum("powerOnHoursMax", filters.powerOnHoursMax);
  setNum("powerCyclesMin", filters.powerCyclesMin);
  setNum("powerCyclesMax", filters.powerCyclesMax);
  setNum("powerOffCountMin", filters.powerOffCountMin);
  setNum("powerOffCountMax", filters.powerOffCountMax);
  setNum("lifetimeMin", filters.lifetimeMin);
  setNum("lifetimeMax", filters.lifetimeMax);

  if (extras?.criticalOnly) out.criticalOnly = true;

  return out;
}

/** Convert ReportFilters into IssueQueryFilters for the shared engine. */
export function reportFiltersToIssueQueryFilters(filters: ReportFilters): IssueQueryFilters {
  const out: IssueQueryFilters = {};
  const take = (value: string) => (value.trim() ? value.trim() : undefined);

  out.vehicleNumber = take(filters.vehicleNumber);
  out.deviceImei = take(filters.deviceImei);
  out.issueType = take(filters.issueType);
  out.motherboardIssue = take(filters.motherboardIssue);
  out.pmmIssue = take(filters.pmmIssue);
  out.ssdIssue = take(filters.ssdIssue);
  out.otherIssue = take(filters.otherIssue);
  out.motherboardType = take(filters.motherboardType);
  out.pmmType = take(filters.pmmType);
  out.ssdType = take(filters.ssdType);
  out.softwareVersion = take(filters.softwareVersion);
  out.flespiStatus = take(filters.flespiStatus);
  out.screenStatus = take(filters.screenStatus);
  out.dotmatrixStatus = take(filters.dotmatrixStatus);
  out.imeiChanged = take(filters.imeiChanged);
  out.simChanged = take(filters.simChanged);
  out.createdFrom = take(filters.createdFrom);
  if (filters.createdTo.trim()) {
    out.createdTo = filters.createdTo.includes("T")
      ? filters.createdTo
      : `${filters.createdTo}T23:59:59.999Z`;
  }
  if (filters.ssd) out.ssd = filters.ssd;
  if (filters.motherboard) out.motherboard = filters.motherboard;
  if (filters.sataCable) out.sataCable = filters.sataCable;
  if (filters.sshStatus === "true") out.sshStatus = true;
  if (filters.sshStatus === "false") out.sshStatus = false;
  if (filters.deviceChanged === "true") out.deviceChanged = true;
  if (filters.deviceChanged === "false") out.deviceChanged = false;

  return out;
}
