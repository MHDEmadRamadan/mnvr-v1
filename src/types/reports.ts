import type { Issue } from "@/types/issue";
import type {
  ReplacementMotherboard,
  ReplacementSataCable,
  ReplacementSsd,
} from "@/types/replacements";

/** Multi-field report filters — independent from Issues dashboard filters. */
export type ReportFilters = {
  vehicleNumber: string;
  deviceImei: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  issueSource: string;
  motherboardType: string;
  pmmType: string;
  ssdType: string;
  softwareVersion: string;
  flespiStatus: string;
  screenStatus: string;
  dotmatrixStatus: string;
  /** "" = any, "true" | "false" */
  sshStatus: "" | "true" | "false";
  /** "" = any */
  ssd: "" | ReplacementSsd;
  motherboard: "" | ReplacementMotherboard;
  sataCable: "" | ReplacementSataCable;
  imeiChanged: string;
  simChanged: string;
  deviceChanged: "" | "true" | "false";
  createdFrom: string;
  createdTo: string;
};

export type ReportQueryParams = {
  filters: ReportFilters;
  page: number;
  pageSize: number;
};

export type ReportQueryResult = {
  items: Issue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ReportBreakdownItem = {
  label: string;
  count: number;
};

export type ReportMetrics = {
  totalIssues: number;
  byIssueType: ReportBreakdownItem[];
  byMotherboardType: ReportBreakdownItem[];
  byPmmType: ReportBreakdownItem[];
  bySsdType: ReportBreakdownItem[];
  bySource: ReportBreakdownItem[];
  topFailures: ReportBreakdownItem[];
  topReplacements: ReportBreakdownItem[];
  monthlyTrends: ReportBreakdownItem[];
};

export type ReportExportFormat = "csv" | "xlsx";
