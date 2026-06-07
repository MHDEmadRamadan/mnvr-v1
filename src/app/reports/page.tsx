"use client";

import { useCallback, useState } from "react";
import { useReports } from "@/hooks/useReports";
import { hasActiveReportFilters, reportFilterSummary } from "@/lib/reports/reports-filters";
import { dashboardBtnPrimary, dashboardPanel } from "@/components/issues/dashboard-ui";
import { ReportsFiltersPanel } from "@/components/reports/ReportsFiltersPanel";
import { ReportsSummaryCards } from "@/components/reports/ReportsSummaryCards";
import { ReportsCharts } from "@/components/reports/ReportsCharts";
import { ReportsResultsTable } from "@/components/reports/ReportsResultsTable";
import { Toasts, type Toast } from "@/components/Toasts";

export default function ReportsPage() {
  const {
    filters,
    setFilters,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    query,
    metrics,
    loading,
    metricsLoading,
    error,
    exporting,
    exportReport,
  } = useReports();

  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    const toast: Toast = { id: crypto.randomUUID(), type, message };
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 2600);
  }, []);

  const handleExport = useCallback(
    async (format: "csv" | "xlsx") => {
      try {
        await exportReport(format);
        pushToast("success", `Exported filtered results as ${format.toUpperCase()}`);
      } catch (e) {
        pushToast("error", e instanceof Error ? e.message : "Export failed");
      }
    },
    [exportReport, pushToast],
  );

  const activeSummary = reportFilterSummary(filters);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Advanced maintenance analysis — combine filters for monthly failure and replacement reporting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport("csv")}
            disabled={!!exporting || loading}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={() => void handleExport("xlsx")}
            disabled={!!exporting || loading}
            className={dashboardBtnPrimary}
          >
            {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </header>

      <ReportsFiltersPanel value={filters} onChange={setFilters} onApply={applyFilters} onReset={resetFilters} />

      {hasActiveReportFilters(filters) ? (
        <div className={`${dashboardPanel} px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400`}>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Pending filters: </span>
          {activeSummary.join(" · ")}
          <span className="ml-2 text-zinc-400">— click Apply filters to run report</span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <ReportsSummaryCards metrics={metrics} loading={metricsLoading} />

      <ReportsCharts metrics={metrics} loading={metricsLoading} />

      <ReportsResultsTable
        items={query.items}
        loading={loading}
        total={query.total}
        page={query.page}
        pageSize={query.pageSize}
        totalPages={query.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <Toasts toasts={toasts} />
    </div>
  );
}
