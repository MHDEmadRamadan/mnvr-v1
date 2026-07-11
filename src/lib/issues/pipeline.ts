import type { Issue, IssueQueryFilters, IssueSort } from "@/types/issue";
import { issueMatchesGlobalSearch } from "@/lib/issues/issue-search";

export function computeTotalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

const SORT_ACCESSORS: Record<string, (row: Issue) => string | number | boolean | null> = {
  vehicleNumber: (r) => r.vehicleNumber ?? "",
  deviceImei: (r) => r.deviceImei ?? "",
  deviceTickets: (r) => r.deviceTickets ?? "",
  softwareVersion: (r) => r.softwareVersion ?? "",
  flespiStatus: (r) => r.flespiStatus ?? "",
  screenStatus: (r) => r.screenStatus ?? "",
  dotMatrixStatus: (r) => r.dotMatrixStatus ?? "",
  sshStatus: (r) => (r.sshStatus === null ? "" : r.sshStatus ? 1 : 0),
  pmmSoftware: (r) => r.pmmSoftware ?? -1,
  issueType: (r) => r.issueType,
  motherboardIssue: (r) => r.motherboardIssue,
  pmmIssue: (r) => r.pmmIssue,
  ssdIssue: (r) => r.ssdIssue,
  otherIssue: (r) => r.otherIssue,
  motherboardType: (r) => r.motherboardType ?? "",
  pmmType: (r) => r.pmmType ?? "",
  ssdType: (r) => r.ssdType ?? "",
  diskHealth: (r) => (r.diskHealth === null ? "" : r.diskHealth ? 1 : 0),
  powerOnHours: (r) => r.powerOnHours ?? -1,
  powerCycles: (r) => r.powerCycles ?? -1,
  powerOffCount: (r) => r.powerOffCount ?? -1,
  lifetime: (r) => r.lifetime ?? -1,
  summarySsd: (r) => r.summarySsd ?? "",
  ssd: (r) => r.ssd ?? "",
  motherboard: (r) => r.motherboard ?? "",
  sataCable: (r) => r.sataCable ?? "",
  imeiChanged: (r) =>
    r.imeiChanged === null || r.imeiChanged === undefined ? "" : String(r.imeiChanged),
  simChanged: (r) =>
    r.simChanged === null || r.simChanged === undefined ? "" : String(r.simChanged),
  deviceChanged: (r) => (r.deviceChanged ? 1 : 0),
  description: (r) => r.description,
  createdAt: (r) => r.createdAt,
};

export function sortIssueRows(rows: Issue[], sort: IssueSort): Issue[] {
  const accessor = SORT_ACCESSORS[sort.key] ?? ((r: Issue) => r.createdAt);
  const dir = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av === bv) return 0;
    if (av === null || av === "") return 1;
    if (bv === null || bv === "") return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    if (typeof av === "boolean" && typeof bv === "boolean") return (Number(av) - Number(bv)) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function includesFilter(value: string | null | undefined, filter: string | undefined): boolean {
  if (!filter?.trim()) return true;
  return (value ?? "").toLowerCase().includes(filter.trim().toLowerCase());
}

/** Client-side refinement when server filters are partial. */
export function refineIssueRows(rows: Issue[], filters: IssueQueryFilters): Issue[] {
  return rows.filter((row) => {
    if (!issueMatchesGlobalSearch(row, filters.globalSearch ?? "")) return false;
    if (filters.issueType?.trim()) {
      const q = filters.issueType.trim().toLowerCase();
      if (!row.issueType.toLowerCase().includes(q)) return false;
    }
    if (filters.deviceImei?.trim()) {
      const q = filters.deviceImei.trim().toLowerCase();
      if (!(row.deviceImei ?? "").toLowerCase().includes(q)) return false;
    }
    if (!includesFilter(row.vehicleNumber, filters.vehicleNumber)) return false;
    if (!includesFilter(row.flespiStatus, filters.flespiStatus)) return false;
    if (!includesFilter(row.screenStatus, filters.screenStatus)) return false;
    if (filters.createdFrom) {
      if (new Date(row.createdAt).getTime() < new Date(filters.createdFrom).getTime()) return false;
    }
    if (filters.createdTo) {
      if (new Date(row.createdAt).getTime() > new Date(filters.createdTo).getTime()) return false;
    }
    return true;
  });
}

export function paginateIssueRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  return rows.slice(from, from + pageSize);
}

export type IssuePipelineResult = {
  all: Issue[];
  filtered: Issue[];
  sorted: Issue[];
  pageItems: Issue[];
  total: number;
  totalPages: number;
  safePage: number;
};

export function runIssuePipeline(
  dataset: Issue[],
  filters: IssueQueryFilters,
  sort: IssueSort,
  page: number,
  pageSize: number,
): IssuePipelineResult {
  const effectivePageSize = Math.max(1, pageSize);
  const filtered = refineIssueRows(dataset, filters);
  const sorted = sortIssueRows(filtered, sort);
  const total = sorted.length;
  const totalPages = computeTotalPages(total, effectivePageSize);
  const safePage = clampPage(page, totalPages);
  const pageItems = paginateIssueRows(sorted, safePage, effectivePageSize);

  return { all: dataset, filtered, sorted, pageItems, total, totalPages, safePage };
}
