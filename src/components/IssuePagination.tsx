"use client";

import { memo } from "react";
import { clampPage, computeTotalPages } from "@/lib/issues/pipeline";
import { ISSUES_PAGE_SIZE_OPTIONS } from "@/lib/issues/pagination-config";
import { dashboardBtnSecondary, dashboardSelect } from "@/components/issues/dashboard-ui";

type IssuePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  embedded?: boolean;
};

function IssuePaginationComponent({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  embedded = false,
}: IssuePaginationProps) {
  const totalPages = computeTotalPages(total, pageSize);
  const safePage = clampPage(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  const shellClass = embedded
    ? "flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-zinc-200/80 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/50"
    : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900";

  return (
    <nav aria-label="Table pagination" className={shellClass}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {total === 0 ? (
          <span>No matching records</span>
        ) : (
          <>
            Showing{" "}
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of{" "}
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {total.toLocaleString()}
            </span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
            Page{" "}
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{safePage}</span> of{" "}
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{totalPages}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="whitespace-nowrap">Rows per page</span>
          <select
            className={`${dashboardSelect} w-auto min-w-[4.5rem]`}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {ISSUES_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5" role="group" aria-label="Page navigation">
          <button type="button" className={dashboardBtnSecondary} onClick={() => onPageChange(1)} disabled={safePage <= 1}>
            First
          </button>
          <button
            type="button"
            className={dashboardBtnSecondary}
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className={dashboardBtnSecondary}
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages || total === 0}
          >
            Next
          </button>
          <button
            type="button"
            className={dashboardBtnSecondary}
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages || total === 0}
          >
            Last
          </button>
        </div>
      </div>
    </nav>
  );
}

export const IssuePagination = memo(IssuePaginationComponent);
