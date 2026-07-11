"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportFilters, ReportMetrics, ReportQueryResult } from "@/types/reports";
import { defaultReportFilters } from "@/lib/reports/reports-filters";
import { downloadReportExport, fetchReportMetrics, fetchReportQuery } from "@/lib/reports/reports-client";
import { REPORTS_PAGE_SIZE_DEFAULT } from "@/lib/reports/reports-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/contexts/AuthContext";

const EMPTY_METRICS: ReportMetrics = {
  totalIssues: 0,
  byIssueType: [],
  byMotherboardType: [],
  byPmmType: [],
  bySsdType: [],
  topFailures: [],
  topReplacements: [],
  monthlyTrends: [],
};

const EMPTY_QUERY: ReportQueryResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: REPORTS_PAGE_SIZE_DEFAULT,
  totalPages: 1,
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function useReports(initialFilters?: ReportFilters) {
  const { getAccessToken, isAdmin } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>(initialFilters ?? defaultReportFilters());
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(filters);
  const debouncedApplied = useDebouncedValue(appliedFilters, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(REPORTS_PAGE_SIZE_DEFAULT);

  const [query, setQuery] = useState<ReportQueryResult>(EMPTY_QUERY);
  const [metrics, setMetrics] = useState<ReportMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(debouncedApplied), [debouncedApplied]);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1);
  }, [filters]);

  const resetFilters = useCallback(() => {
    const empty = defaultReportFilters();
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- loading flag when report filters change */
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await fetchReportQuery(getAccessToken, debouncedApplied, page, pageSize);
        if (!cancelled) setQuery(result);
      } catch (e) {
        if (!cancelled) {
          setError(toErrorMessage(e));
          setQuery(EMPTY_QUERY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtersKey, page, pageSize, debouncedApplied, getAccessToken, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- metrics loading when filters change */
    setMetricsLoading(true);

    void (async () => {
      try {
        const data = await fetchReportMetrics(getAccessToken, debouncedApplied);
        if (!cancelled) setMetrics(data);
      } catch {
        if (!cancelled) setMetrics(EMPTY_METRICS);
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtersKey, debouncedApplied, getAccessToken, isAdmin]);

  const exportReport = useCallback(
    async (format: "csv" | "xlsx") => {
      setExporting(format);
      try {
        await downloadReportExport(getAccessToken, debouncedApplied, format);
      } finally {
        setExporting(null);
      }
    },
    [debouncedApplied, getAccessToken],
  );

  return {
    filters,
    setFilters,
    appliedFilters: debouncedApplied,
    applyFilters,
    resetFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    query,
    metrics,
    loading,
    metricsLoading,
    error,
    exporting,
    exportReport,
  };
}
