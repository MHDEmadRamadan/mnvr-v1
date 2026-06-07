import type { ReportExportFormat, ReportFilters, ReportMetrics, ReportQueryResult } from "@/types/reports";
import { serializeReportFilters } from "@/lib/reports/reports-filters";

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export async function fetchReportQuery(
  filters: ReportFilters,
  page: number,
  pageSize: number,
): Promise<ReportQueryResult> {
  const params = new URLSearchParams({
    filters: serializeReportFilters(filters),
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`/api/reports/query?${params.toString()}`);
  return parseJson<ReportQueryResult>(res);
}

export async function fetchReportMetrics(filters: ReportFilters): Promise<ReportMetrics> {
  const params = new URLSearchParams({ filters: serializeReportFilters(filters) });
  const res = await fetch(`/api/reports/metrics?${params.toString()}`);
  return parseJson<ReportMetrics>(res);
}

export async function downloadReportExport(filters: ReportFilters, format: ReportExportFormat): Promise<void> {
  const params = new URLSearchParams({
    filters: serializeReportFilters(filters),
    format,
  });
  const res = await fetch(`/api/reports/export?${params.toString()}`);
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
