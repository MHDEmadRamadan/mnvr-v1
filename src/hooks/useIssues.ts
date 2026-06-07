"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Issue,
  IssueCreateInput,
  IssueKpis,
  IssueQueryParams,
  IssueUpdateInput,
} from "@/types/issue";
import { runIssuePipeline } from "@/lib/issues/pipeline";
import {
  createIssue as apiCreate,
  deleteIssue as apiDelete,
  deleteIssues as apiDeleteMany,
  fetchEnrichedIssueDataset,
  fetchIssueKpis,
  subscribeToIssues,
  updateIssue as apiUpdate,
  type IssuesDbCounts,
} from "@/lib/issues-api";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

const EMPTY_KPIS: IssueKpis = { total: 0, open: 0, resolved: 0, critical: 0 };

export function useIssues(params: IssueQueryParams) {
  const [dataset, setDataset] = useState<Issue[]>([]);
  const [kpis, setKpis] = useState<IssueKpis>(EMPTY_KPIS);
  const [dbCounts, setDbCounts] = useState<IssuesDbCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(params.filters);

  const loadDataset = useCallback(async () => {
    const [rows, kpiData] = await Promise.all([
      fetchEnrichedIssueDataset(params.filters),
      fetchIssueKpis(params.filters),
    ]);
    const deviceIds = new Set(rows.map((r) => r.deviceId));
    setDataset(rows);
    setDbCounts({ issueRecords: rows.length, devices: deviceIds.size });
    setKpis(kpiData);
    return rows;
  }, [params.filters]);

  const reload = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        await loadDataset();
      } catch (e) {
        setError(toErrorMessage(e));
        setDataset([]);
        setDbCounts(null);
        setKpis(EMPTY_KPIS);
      } finally {
        setLoading(false);
      }
    },
    [loadDataset],
  );

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- loading flag when filters change */
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        await loadDataset();
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(toErrorMessage(e));
          setDataset([]);
          setDbCounts(null);
          setKpis(EMPTY_KPIS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtersKey, loadDataset]);

  useEffect(() => {
    return subscribeToIssues(() => {
      void reload(false);
    });
  }, [reload]);

  const pipeline = useMemo(
    () => runIssuePipeline(dataset, params.filters, params.sort, params.page, params.pageSize),
    [dataset, params.filters, params.sort, params.page, params.pageSize],
  );

  const create = useCallback(
    async (input: IssueCreateInput) => {
      const created = await apiCreate(input);
      await reload(false);
      return created;
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, patch: IssueUpdateInput) => {
      const saved = await apiUpdate(id, patch);
      setDataset((prev) => prev.map((row) => (row.id === id ? saved : row)));
      return saved;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    let snapshot: Issue[] = [];
    setDataset((prev) => {
      snapshot = prev;
      return prev.filter((row) => row.id !== id);
    });
    try {
      await apiDelete(id);
    } catch (e) {
      setDataset(snapshot);
      throw e;
    }
  }, []);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    let snapshot: Issue[] = [];
    const idSet = new Set(ids);
    setDataset((prev) => {
      snapshot = prev;
      return prev.filter((row) => !idSet.has(row.id));
    });
    try {
      await apiDeleteMany(ids);
    } catch (e) {
      setDataset(snapshot);
      throw e;
    }
  }, []);

  const refetch = useCallback(() => reload(true), [reload]);

  return useMemo(
    () => ({
      items: pipeline.pageItems,
      sortedRows: pipeline.sorted,
      total: pipeline.total,
      totalPages: pipeline.totalPages,
      safePage: pipeline.safePage,
      kpis,
      dbCounts,
      loading,
      error,
      refetch,
      create,
      update,
      remove,
      removeMany,
    }),
    [
      pipeline.pageItems,
      pipeline.sorted,
      pipeline.total,
      pipeline.totalPages,
      pipeline.safePage,
      kpis,
      dbCounts,
      loading,
      error,
      refetch,
      create,
      update,
      remove,
      removeMany,
    ],
  );
}
