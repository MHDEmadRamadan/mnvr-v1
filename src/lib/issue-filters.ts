import type { IssueQueryFilters } from "@/types/issue";

export type IssuesFilterState = {
  issueType: string;
  deviceImei: string;
  issueSource: string;
  vehicleNumber: string;
  flespiStatus: string;
  screenStatus: string;
  globalSearch: string;
  dateMode: "all" | "current_month" | "range";
  fromDate: string;
  toDate: string;
};

function monthRange(reference = new Date()) {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export function toIssueQueryFilters(state: IssuesFilterState): IssueQueryFilters {
  const filters: IssueQueryFilters = {};

  if (state.issueType.trim()) filters.issueType = state.issueType.trim();
  if (state.deviceImei.trim()) filters.deviceImei = state.deviceImei.trim();
  if (state.issueSource.trim()) filters.issueSource = state.issueSource.trim();
  if (state.vehicleNumber.trim()) filters.vehicleNumber = state.vehicleNumber.trim();
  if (state.flespiStatus.trim()) filters.flespiStatus = state.flespiStatus.trim();
  if (state.screenStatus.trim()) filters.screenStatus = state.screenStatus.trim();
  if (state.globalSearch.trim()) filters.globalSearch = state.globalSearch.trim();

  if (state.dateMode === "current_month") {
    const { from, to } = monthRange();
    filters.createdFrom = from.toISOString();
    filters.createdTo = to.toISOString();
  } else if (state.dateMode === "range") {
    if (state.fromDate) {
      filters.createdFrom = new Date(state.fromDate + "T00:00:00.000Z").toISOString();
    }
    if (state.toDate) {
      filters.createdTo = new Date(state.toDate + "T23:59:59.999Z").toISOString();
    }
  }

  return filters;
}

export function defaultFilterState(): IssuesFilterState {
  const month = monthRange();
  return {
    issueType: "",
    deviceImei: "",
    issueSource: "",
    vehicleNumber: "",
    flespiStatus: "",
    screenStatus: "",
    globalSearch: "",
    dateMode: "all",
    fromDate: isoToDateInput(month.from.toISOString()),
    toDate: isoToDateInput(month.to.toISOString()),
  };
}

export function describeFilterState(state: IssuesFilterState): string[] {
  const parts: string[] = [];
  if (state.globalSearch.trim()) parts.push(`Search: ${state.globalSearch.trim()}`);
  if (state.issueType.trim()) parts.push(`Issue type: ${state.issueType.trim()}`);
  if (state.deviceImei.trim()) parts.push(`IMEI: ${state.deviceImei.trim()}`);
  if (state.vehicleNumber.trim()) parts.push(`Vehicle: ${state.vehicleNumber.trim()}`);
  if (state.flespiStatus.trim()) parts.push(`Flespi: ${state.flespiStatus.trim()}`);
  if (state.screenStatus.trim()) parts.push(`Screen: ${state.screenStatus.trim()}`);
  if (state.issueSource.trim()) parts.push(`Source: ${state.issueSource.trim()}`);
  if (state.dateMode === "current_month") parts.push("Date: current month");
  if (state.dateMode === "range") {
    const range = [state.fromDate, state.toDate].filter(Boolean).join(" → ");
    parts.push(`Date: ${range || "custom range"}`);
  }
  return parts;
}

function isoToDateInput(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
