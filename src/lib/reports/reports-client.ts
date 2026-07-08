import type { ReportExportFormat, ReportFilters, ReportMetrics, ReportQueryResult } from "@/types/reports";
import { isValidAccessToken } from "@/lib/auth-token";
import { serializeReportFilters } from "@/lib/reports/reports-filters";

async function authHeaders(getAccessToken: () => Promise<string | null>): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!isValidAccessToken(token)) {
    throw new Error("Not authenticated. Please sign in again.");
  }
  return { Authorization: `Bearer ${token}` };
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export async function fetchReportQuery(
  getAccessToken: () => Promise<string | null>,
  filters: ReportFilters,
  page: number,
  pageSize: number,
): Promise<ReportQueryResult> {
  const params = new URLSearchParams({
    filters: serializeReportFilters(filters),
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`/api/reports/query?${params.toString()}`, {
    headers: await authHeaders(getAccessToken),
  });
  return parseJson<ReportQueryResult>(res);
}

export async function fetchReportMetrics(
  getAccessToken: () => Promise<string | null>,
  filters: ReportFilters,
): Promise<ReportMetrics> {
  const params = new URLSearchParams({ filters: serializeReportFilters(filters) });
  const res = await fetch(`/api/reports/metrics?${params.toString()}`, {
    headers: await authHeaders(getAccessToken),
  });
  return parseJson<ReportMetrics>(res);
}

export async function downloadReportExport(
  getAccessToken: () => Promise<string | null>,
  filters: ReportFilters,
  format: ReportExportFormat,
): Promise<void> {
  const params = new URLSearchParams({
    filters: serializeReportFilters(filters),
    format,
  });
  const res = await fetch(`/api/reports/export?${params.toString()}`, {
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Export failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `issues-report.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
