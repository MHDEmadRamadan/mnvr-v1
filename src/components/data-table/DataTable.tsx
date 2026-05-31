"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { DataTableColumn, DataTableColumnGroup, SortState } from "@/components/data-table/types";
import {
  ACTIONS_COLUMN_WIDTH,
  ACTIONS_INNER,
  HEADER_STICKY,
  STICKY_ACTIONS_HEADER,
  STICKY_SELECT_HEADER,
  TABLE_ELEMENT,
  TABLE_SCROLL_REGION,
  dataCellClass,
  getRowVariant,
  rowClass,
  stickyActionsCellClass,
  stickySelectCellClass,
} from "@/components/data-table/table-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

export type DataTableProps<T> = {
  rows: T[];
  loading: boolean;
  columnGroups: DataTableColumnGroup<T>[];
  visibleColumnIds: Set<string>;
  visibilityKey: string;
  sort: SortState;
  page: number;
  pageSize: number;
  rowKey: (row: T) => string;
  onSortChange: (next: SortState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  renderActions?: (row: T) => React.ReactNode;
  skeletonRows?: number;
  enableSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  embedded?: boolean;
};

export function DataTable<T>({
  rows,
  loading,
  columnGroups,
  visibleColumnIds,
  visibilityKey,
  sort,
  page,
  pageSize,
  rowKey,
  onSortChange,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting filters or add a new record.",
  renderActions,
  skeletonRows,
  enableSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  embedded = false,
}: DataTableProps<T>) {
  const visibleGroups = useMemo(
    () =>
      columnGroups
        .map((g) => ({ ...g, columns: g.columns.filter((c) => visibleColumnIds.has(c.id)) }))
        .filter((g) => g.columns.length > 0),
    [columnGroups, visibleColumnIds, visibilityKey],
  );

  const visibleColumns = useMemo(() => visibleGroups.flatMap((g) => g.columns), [visibleGroups]);
  const rowOffset = (Math.max(1, page) - 1) * pageSize;
  const hasActions = !!renderActions;
  const skeletonCount = skeletonRows ?? pageSize;

  const tanstackColumns = useMemo((): ColumnDef<T>[] => {
    const defs: ColumnDef<T>[] = [];

    if (enableSelection) {
      defs.push({
        id: "_select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all rows on page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 44,
      });
    }

    for (const col of visibleColumns) {
      defs.push({
        id: col.id,
        accessorFn: (row) => col.sortValue?.(row as T) ?? col.id,
        header: col.label,
        cell: ({ row }) =>
          col.render(row.original, { rowIndex: rowOffset + row.index + 1, page, pageSize }),
        enableSorting: col.sortable !== false,
        meta: { className: col.className, config: col },
      });
    }

    return defs;
  }, [enableSelection, visibleColumns, rowOffset, page, pageSize, visibilityKey]);

  const table = useReactTable({
    data: rows,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => rowKey(row),
    enableRowSelection: enableSelection,
    onRowSelectionChange: (updater) => {
      if (!onRowSelectionChange) return;
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    state: { rowSelection },
    manualSorting: true,
  });

  function toggleSort(colId: string, sortable: boolean) {
    if (!sortable) return;
    if (sort.key === colId) {
      onSortChange({ key: colId, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ key: colId, direction: "asc" });
    }
  }

  const colSpanData = visibleColumns.length + (enableSelection ? 1 : 0);
  const shellClass = embedded ? "flex min-h-[12rem] flex-1 flex-col" : `${dashboardPanel} overflow-hidden`;

  return (
    <div className={shellClass}>
      <div className={embedded ? TABLE_SCROLL_REGION : "overflow-auto"}>
        <table className={TABLE_ELEMENT}>
          <thead>
            <tr className={`${HEADER_STICKY} top-0`}>
              {enableSelection ? (
                <th
                  rowSpan={2}
                  className={`${STICKY_SELECT_HEADER} top-0 w-11 border-b border-zinc-200/80 px-2 py-3 dark:border-zinc-800`}
                />
              ) : null}
              {visibleGroups.map((group) => (
                <th
                  key={group.id}
                  colSpan={group.columns.length}
                  scope="colgroup"
                  className={`sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-50 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400`}
                >
                  {group.label}
                </th>
              ))}
              {hasActions ? (
                <th
                  rowSpan={2}
                  className={`${STICKY_ACTIONS_HEADER} ${ACTIONS_COLUMN_WIDTH} top-0 border-b px-2 py-3 text-right align-bottom text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400`}
                >
                  Actions
                </th>
              ) : null}
            </tr>
            <tr className={`${HEADER_STICKY} top-8 shadow-sm`}>
              {table.getHeaderGroups()[0]?.headers
                .filter((h) => h.column.id !== "_select")
                .map((header) => {
                  const colId = header.column.id;
                  const config = header.column.columnDef.meta?.config as DataTableColumn<T> | undefined;
                  const active = sort.key === colId;
                  const sortable = header.column.getCanSort();

                  return (
                    <th
                      key={colId}
                      scope="col"
                      className={`sticky top-8 z-30 border-b border-zinc-200/80 bg-zinc-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 ${config?.className ?? "min-w-[5rem]"}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(colId, sortable)}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span
                            className={
                              active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                            }
                          >
                            {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: skeletonCount }).map((_, idx) => {
                const variant = getRowVariant(idx % 2 === 0, false);
                return (
                  <tr key={`sk-${idx}`} className={rowClass()}>
                    {enableSelection ? (
                      <td className={stickySelectCellClass(variant)}>
                        <div className="h-4 w-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td key={col.id} className={dataCellClass(variant, col.className ?? "min-w-[5rem]")}>
                        <div className="h-4 max-w-[180px] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                      </td>
                    ))}
                    {hasActions ? (
                      <td className={`${stickyActionsCellClass(variant)} ${ACTIONS_COLUMN_WIDTH}`}>
                        <div className={`${ACTIONS_INNER} opacity-40`}>
                          <div className="h-7 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                          <div className="h-7 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpanData + (hasActions ? 1 : 0)} className="px-8 py-20 text-center">
                  <div className="mx-auto max-w-sm">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{emptyTitle}</p>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => {
                const variant = getRowVariant(idx % 2 === 0, row.getIsSelected());
                return (
                  <tr key={row.id} className={rowClass()}>
                    {row.getVisibleCells().map((cell) => {
                      const isSelect = cell.column.id === "_select";
                      const config = cell.column.columnDef.meta?.config as DataTableColumn<T> | undefined;
                      return (
                        <td
                          key={cell.id}
                          className={
                            isSelect
                              ? stickySelectCellClass(variant)
                              : dataCellClass(variant, config?.className ?? "min-w-[5rem]")
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                    {hasActions ? (
                      <td className={`${stickyActionsCellClass(variant)} ${ACTIONS_COLUMN_WIDTH}`}>
                        {renderActions!(row.original)}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
