"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Issue,
  IssueCreateInput,
  IssueKpis,
  IssueQueryParams,
  IssueUpdateInput,
} from "@/types/issue";
import { useAuth } from "@/contexts/AuthContext";
import {
  createIssue as apiCreate,
  deleteIssue as apiDelete,
  deleteIssues as apiDeleteMany,
  fetchIssueKpis,
  fetchIssues,
  updateIssue as apiUpdate,
  type IssuesDbCounts,
} from "@/lib/issues-api";
import { subscribeToIssueChanges } from "@/lib/issues/issues-realtime";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

const EMPTY_KPIS: IssueKpis = { total: 0, open: 0, resolved: 0, critical: 0 };

export type UseIssuesOptions = {
  /** Called when issues are known to have been deleted (local or realtime). */
  onDeletedIds?: (ids: string[]) => void;
};

export function useIssues(params: IssueQueryParams, options?: UseIssuesOptions) {
  const { isAuthenticated } = useAuth();
  const onDeletedIdsRef = useRef(options?.onDeletedIds);
  useEffect(() => {
    onDeletedIdsRef.current = options?.onDeletedIds;
  }, [options?.onDeletedIds]);
  const [items, setItems] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [safePage, setSafePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState<IssueKpis>(EMPTY_KPIS);
  const [dbCounts, setDbCounts] = useState<IssuesDbCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = useMemo(
    () =>
      JSON.stringify({
        filters: params.filters,
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
      }),
    [params.filters, params.page, params.pageSize, params.sort],
  );

  const loadPage = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [pageResult, kpiData] = await Promise.all([
        fetchIssues(params),
        fetchIssueKpis(params.filters),
      ]);
      setItems(pageResult.items);
      setTotal(pageResult.total);
      setSafePage(pageResult.safePage);
      setTotalPages(pageResult.totalPages);
      setDbCounts(pageResult.dbCounts ?? null);
      setKpis(kpiData);
    } catch (e) {
      setError(toErrorMessage(e));
      setItems([]);
      setTotal(0);
      setSafePage(1);
      setTotalPages(1);
      setDbCounts(null);
      setKpis(EMPTY_KPIS);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadPageRef = useRef(loadPage);
  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- loading flag when query params change */
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [pageResult, kpiData] = await Promise.all([
          fetchIssues(params),
          fetchIssueKpis(params.filters),
        ]);
        if (cancelled) return;
        setItems(pageResult.items);
        setTotal(pageResult.total);
        setSafePage(pageResult.safePage);
        setTotalPages(pageResult.totalPages);
        setDbCounts(pageResult.dbCounts ?? null);
        setKpis(kpiData);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(toErrorMessage(e));
          setItems([]);
          setTotal(0);
          setSafePage(1);
          setTotalPages(1);
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
  }, [paramsKey, params]);

  // Realtime: refetch current page when another user (or tab) changes issues.
  // RLS on postgres_changes ensures only visible rows trigger events.
  useEffect(() => {
    if (!isAuthenticated) return;

    return subscribeToIssueChanges((event, meta) => {
      if (event === "DELETE" && meta?.id) {
        onDeletedIdsRef.current?.([meta.id]);
      }
      void loadPageRef.current(false);
    });
  }, [isAuthenticated]);

  const create = useCallback(
    async (input: IssueCreateInput) => {
      const created = await apiCreate(input);
      await loadPage(false);
      return created;
    },
    [loadPage],
  );

  const update = useCallback(
    async (id: string, patch: IssueUpdateInput) => {
      const saved = await apiUpdate(id, patch);
      setItems((prev) => prev.map((row) => (row.id === id ? saved : row)));
      return saved;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    onDeletedIdsRef.current?.([id]);
    await loadPage(false);
  }, [loadPage]);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await apiDeleteMany(ids);
    onDeletedIdsRef.current?.(ids);
    await loadPage(false);
  }, [loadPage]);

  const refetch = useCallback(() => loadPage(true), [loadPage]);

  return useMemo(
    () => ({
      items,
      total,
      totalPages,
      safePage,
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
      items,
      total,
      totalPages,
      safePage,
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
