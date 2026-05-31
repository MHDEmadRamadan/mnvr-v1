import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type SortState = {
  key: string;
  direction: SortDirection;
};

export type DataTableColumn<T> = {
  id: string;
  label: string;
  className?: string;
  sortable?: boolean;
  /** When false, column cannot be hidden. */
  hideable?: boolean;
  render: (row: T, ctx: { rowIndex: number; page: number; pageSize: number }) => ReactNode;
  sortValue?: (row: T) => string | number | boolean | null;
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
    config?: DataTableColumn<TData>;
  }
}

export type DataTableColumnGroup<T> = {
  id: string;
  label: string;
  columns: DataTableColumn<T>[];
};
