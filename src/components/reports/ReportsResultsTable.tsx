"use client";

import type { Issue } from "@/types/issue";
import { REPORT_TABLE_COLUMNS } from "@/config/reports-table-config";
import { formatDisplayDate, sanitizeText } from "@/components/data-table/cells";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

type Props = {
  items: Issue[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function cellValue(row: Issue, colId: string): string {
  switch (colId) {
    case "vehicleNumber":
      return sanitizeText(row.vehicleNumber);
    case "deviceImei":
      return sanitizeText(row.deviceImei);
    case "deviceTickets":
      return sanitizeText(row.deviceTickets);
    case "issueType":
      return sanitizeText(row.issueType);
    case "motherboardIssue":
      return sanitizeText(row.motherboardIssue);
    case "pmmIssue":
      return sanitizeText(row.pmmIssue);
    case "ssdIssue":
      return sanitizeText(row.ssdIssue);
    case "motherboardType":
      return sanitizeText(row.motherboardType);
    case "pmmType":
      return sanitizeText(row.pmmType);
    case "ssdType":
      return sanitizeText(row.ssdType);
    case "createdAt":
      return formatDisplayDate(row.createdAt);
    default:
      return "";
  }
}

export function ReportsResultsTable({
  items,
  loading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <div className={`${dashboardPanel} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {loading ? "Loading results…" : `${total.toLocaleString()} matching issues`}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200/80 bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
            <tr>
              {REPORT_TABLE_COLUMNS.map((col) => (
                <th key={col.id} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={REPORT_TABLE_COLUMNS.length} className="px-3 py-10 text-center text-zinc-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={REPORT_TABLE_COLUMNS.length} className="px-3 py-10 text-center text-zinc-400">
                  No issues match the current filters.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-800/30"
                >
                  {REPORT_TABLE_COLUMNS.map((col) => (
                    <td key={col.id} className="max-w-[14rem] truncate whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                      {cellValue(row, col.id)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <PagerButton disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
            Previous
          </PagerButton>
          <PagerButton disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>
            Next
          </PagerButton>
        </div>
      </div>
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
    >
      {children}
    </button>
  );
}
