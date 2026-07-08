"use client";

import { useCallback } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import type { Issue } from "@/types/issue";
import { DataTable } from "@/components/data-table/DataTable";
import { TableActionButton, TableRowActions } from "@/components/data-table/TableRowActions";
import type { SortState } from "@/components/data-table/types";
import { ISSUES_TABLE_GROUPS } from "@/config/issues-table-config";
import { getIssueRowKey } from "@/lib/issue-row-utils";

type IssuesDashboardTableProps = {
  items: Issue[];
  loading: boolean;
  visibleKeys: Set<string>;
  visibilityKey: string;
  sort: SortState;
  page: number;
  pageSize: number;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (state: RowSelectionState) => void;
  onSortChange: (next: SortState) => void;
  onView: (issue: Issue) => void;
  onEdit: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
  onCopy: (issue: Issue) => void;
  canDelete?: boolean;
};

export function IssuesDashboardTable({
  items,
  loading,
  visibleKeys,
  visibilityKey,
  sort,
  page,
  pageSize,
  rowSelection,
  onRowSelectionChange,
  onSortChange,
  onView,
  onEdit,
  onDelete,
  onCopy,
  canDelete = false,
}: IssuesDashboardTableProps) {
  const renderActions = useCallback(
    (row: Issue) => (
      <TableRowActions>
        <TableActionButton variant="secondary" onClick={() => onView(row)}>
          View
        </TableActionButton>
        <TableActionButton variant="secondary" onClick={() => onEdit(row)}>
          Edit
        </TableActionButton>
        <TableActionButton variant="secondary" onClick={() => onCopy(row)} title="Copy row to clipboard">
          Copy
        </TableActionButton>
        {canDelete ? (
          <TableActionButton variant="destructive" onClick={() => onDelete(row)}>
            Delete
          </TableActionButton>
        ) : null}
      </TableRowActions>
    ),
    [onView, onEdit, onDelete, onCopy, canDelete],
  );

  return (
    <DataTable
      rows={items}
      loading={loading}
      columnGroups={ISSUES_TABLE_GROUPS}
      visibleColumnIds={visibleKeys}
      visibilityKey={visibilityKey}
      sort={sort}
      page={page}
      pageSize={pageSize}
      rowKey={getIssueRowKey}
      onSortChange={onSortChange}
      renderActions={renderActions}
      enableSelection
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      skeletonRows={pageSize}
      embedded
      emptyTitle="No issues found"
      emptyDescription="Adjust filters or create a new issue for a device."
    />
  );
}
