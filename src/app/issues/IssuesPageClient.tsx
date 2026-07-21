"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RowSelectionState } from "@tanstack/react-table";
import type { Issue, IssueCreateInput, IssueUpdateInput } from "@/types/issue";
import { useIssues } from "@/hooks/useIssues";
import { useAuth } from "@/contexts/AuthContext";
import { useIssueColumns } from "@/hooks/useIssueColumns";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  defaultFilterState,
  filtersEqual,
  mergeFiltersIntoParams,
  parseFiltersFromParams,
  toIssueQueryFilters,
  type IssuesFilterState,
} from "@/lib/issue-filters";
import { hasActiveIssueFilters } from "@/lib/issue-filters-utils";
import { ISSUES_COLUMN_OPTIONS, ISSUES_TABLE_COLUMNS } from "@/config/issues-table-config";
import { exportIssuesToCsv, copyMaintenanceRecordToClipboard } from "@/lib/issues/export-csv";
import { fetchIssuesForExport } from "@/lib/issues-api";
import { ISSUES_DEFAULT_PAGE_SIZE } from "@/lib/issues/pagination-config";
import { dashboardBtnPrimary, dashboardPanel } from "@/components/issues/dashboard-ui";
import { IssueKpiCards } from "@/components/IssueKpiCards";
import { IssuesOverviewBanner } from "@/components/IssuesOverviewBanner";
import { IssueFilters } from "@/components/IssueFilters";
import { IssuesToolbar } from "@/components/issues/IssuesToolbar";
import { IssuesDashboardTable } from "@/components/issues/IssuesDashboardTable";
import { IssueViewDrawer } from "@/components/issues/IssueViewDrawer";
import type { SortState } from "@/components/data-table/types";
import { IssuePagination } from "@/components/IssuePagination";
import { IssueModal } from "@/components/IssueModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Toasts, type Toast } from "@/components/Toasts";

type ModalMode = "closed" | "create" | "edit";

export default function IssuesPageClient() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skipUrlWriteRef = useRef(false);

  const [filters, setFilters] = useState<IssuesFilterState>(() =>
    parseFiltersFromParams(new URLSearchParams(searchParams.toString())),
  );
  const debouncedFilters = useDebouncedValue(filters, 300);

  useEffect(() => {
    const fromUrl = parseFiltersFromParams(new URLSearchParams(searchParams.toString()));
    setFilters((prev) => {
      if (filtersEqual(prev, fromUrl)) return prev;
      skipUrlWriteRef.current = true;
      return fromUrl;
    });
  }, [searchParams]);

  useEffect(() => {
    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }
    const next = mergeFiltersIntoParams(
      new URLSearchParams(searchParams.toString()),
      debouncedFilters,
    );
    const qs = next.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (qs !== searchParams.toString()) {
      router.replace(target, { scroll: false });
    }
  }, [debouncedFilters, pathname, router, searchParams]);

  const [pageSize, setPageSize] = useState(ISSUES_DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "createdAt", direction: "desc" });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columnKeys = useMemo(() => ISSUES_TABLE_COLUMNS.map((c) => c.id), []);
  const { visibleKeys, visibilityKey, toggleColumn, resetColumns, showAllColumns, hideAllColumns, isLocked } =
    useIssueColumns(columnKeys);

  const queryFilters = useMemo(() => toIssueQueryFilters(debouncedFilters), [debouncedFilters]);

  const queryParams = useMemo(
    () => ({ filters: queryFilters, page, pageSize, sort }),
    [queryFilters, page, pageSize, sort],
  );

  const {
    items,
    total,
    safePage,
    kpis,
    dbCounts,
    loading,
    error,
    create,
    update,
    remove,
    removeMany,
  } = useIssues(queryParams);

  const [exporting, setExporting] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [viewIssue, setViewIssue] = useState<Issue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  const visibleExportColumns = useMemo(
    () => ISSUES_TABLE_COLUMNS.filter((c) => visibleKeys.has(c.id)),
    [visibleKeys],
  );

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    const toast: Toast = { id: crypto.randomUUID(), type, message };
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 2600);
  }, []);

  const handleFilterChange = useCallback((next: IssuesFilterState) => {
    setFilters(next);
    setPage(1);
    setRowSelection({});
  }, []);

  const handleSortChange = useCallback((next: SortState) => {
    setSort(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilterState());
    setPage(1);
    setRowSelection({});
  }, []);

  const openCreate = useCallback(() => {
    setEditingIssue(null);
    setModalMode("create");
  }, []);

  const openEdit = useCallback((issue: Issue) => {
    setEditingIssue(issue);
    setModalMode("edit");
  }, []);

  const closeModal = useCallback(() => {
    setModalMode("closed");
    setEditingIssue(null);
  }, []);

  const handleCopyRow = useCallback(
    async (issue: Issue) => {
      try {
        await copyMaintenanceRecordToClipboard(issue);
        pushToast("success", "Maintenance record copied to clipboard.");
      } catch {
        pushToast("error", "Could not copy maintenance record to clipboard.");
      }
    },
    [pushToast],
  );

  const handleExportCsv = useCallback(async () => {
    if (total === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = await fetchIssuesForExport(queryFilters, sort);
      if (rows.length === 0) {
        pushToast("error", "No rows to export");
        return;
      }
      exportIssuesToCsv(rows, visibleExportColumns);
      pushToast("success", `Exported ${rows.length.toLocaleString()} rows`);
    } catch (e) {
      pushToast("error", e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [total, exporting, queryFilters, sort, visibleExportColumns, pushToast]);

  const handleSave = useCallback(
    async (values: IssueCreateInput | IssueUpdateInput, editingId?: string) => {
      try {
        if (editingId) {
          await update(editingId, values as IssueUpdateInput);
          pushToast("success", "Issue updated");
        } else {
          await create(values as IssueCreateInput);
          pushToast("success", "Issue created");
        }
        closeModal();
      } catch (e) {
        pushToast("error", e instanceof Error ? e.message : "Save failed");
      }
    },
    [create, update, pushToast, closeModal],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      pushToast("success", "Issue deleted");
      setDeleteTarget(null);
      if (safePage > 1) setPage(safePage);
    } catch (e) {
      pushToast("error", e instanceof Error ? e.message : "Delete failed");
    }
  }, [deleteTarget, remove, pushToast, safePage]);

  const handleConfirmBulkDelete = useCallback(async () => {
    try {
      await removeMany(selectedIds);
      pushToast("success", `Deleted ${selectedIds.length} issues`);
      setBulkDeleteOpen(false);
      setRowSelection({});
      if (safePage > 1) setPage(safePage);
    } catch (e) {
      pushToast("error", e instanceof Error ? e.message : "Bulk delete failed");
    }
  }, [selectedIds, removeMany, pushToast, safePage]);

  const deleteLabel = deleteTarget
    ? [deleteTarget.issueType, deleteTarget.deviceImei, deleteTarget.vehicleNumber].filter(Boolean).join(" · ") ||
      deleteTarget.description ||
      "this issue"
    : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Issues</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Maintenance records enriched with device, status, hardware, and storage data
          </p>
        </div>
        <button type="button" onClick={openCreate} className={dashboardBtnPrimary}>
          Add issue
        </button>
      </header>

      <IssueKpiCards kpis={kpis} loading={loading} />

      <IssuesOverviewBanner
        total={total}
        itemsOnPage={items.length}
        dbCounts={dbCounts}
        loading={loading}
        filters={filters}
      />

      <div className={`${dashboardPanel} flex flex-col overflow-hidden`}>
        <IssuesToolbar
          onClearFilters={clearFilters}
          onExportCsv={handleExportCsv}
          selectedCount={selectedIds.length}
          onBulkDelete={() => setBulkDeleteOpen(true)}
          hasActiveFilters={hasActiveIssueFilters(filters)}
          exportDisabled={loading || exporting || total === 0}
          canDelete={isAdmin}
        />

        <IssueFilters
          value={filters}
          onChange={handleFilterChange}
          columns={ISSUES_COLUMN_OPTIONS}
          visibleKeys={visibleKeys}
          onToggleColumn={toggleColumn}
          onShowAllColumns={showAllColumns}
          onHideAllColumns={hideAllColumns}
          onResetColumns={resetColumns}
          isColumnLocked={isLocked}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-zinc-200/80 dark:border-zinc-800/80">
          <IssuesDashboardTable
            items={items}
            loading={loading}
            visibleKeys={visibleKeys}
            visibilityKey={visibilityKey}
            sort={sort}
            page={safePage}
            pageSize={pageSize}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onSortChange={handleSortChange}
            onView={setViewIssue}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onCopy={handleCopyRow}
            canDelete={isAdmin}
          />

          <IssuePagination
            embedded
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
              setRowSelection({});
            }}
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <IssueViewDrawer
        open={!!viewIssue}
        issue={viewIssue}
        onClose={() => setViewIssue(null)}
        onEdit={openEdit}
        onCopy={handleCopyRow}
      />

      <IssueModal
        key={modalMode === "edit" && editingIssue ? editingIssue.id : modalMode}
        open={modalMode !== "closed"}
        issue={modalMode === "edit" ? editingIssue : null}
        onClose={closeModal}
        onSave={handleSave}
      />

      {isAdmin ? (
        <DeleteConfirmModal
          open={!!deleteTarget}
          title="Delete issue?"
          description={
            deleteTarget
              ? `Permanently delete “${deleteLabel}” and related device data when no other issues remain on that device.`
              : ""
          }
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {isAdmin ? (
        <DeleteConfirmModal
          open={bulkDeleteOpen}
          title={`Delete ${selectedIds.length} issues?`}
          description="This will permanently delete the selected issues and remove related device/vehicle data when no other issues remain on those devices."
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />
      ) : null}

      <Toasts toasts={toasts} />
    </div>
  );
}
