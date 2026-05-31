"use client";

import type { IssuesDbCounts } from "@/lib/issues-api";
import type { IssuesFilterState } from "@/lib/issue-filters";
import { describeFilterState } from "@/lib/issue-filters";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

type IssuesOverviewBannerProps = {
  total: number;
  itemsOnPage: number;
  dbCounts: IssuesDbCounts | null;
  loading: boolean;
  filters: IssuesFilterState;
};

export function IssuesOverviewBanner({
  total,
  itemsOnPage,
  dbCounts,
  loading,
  filters,
}: IssuesOverviewBannerProps) {
  const active = describeFilterState(filters);
  const dateHidesAll =
    (filters.dateMode === "current_month" || filters.dateMode === "range") &&
    !loading &&
    total === 0 &&
    (dbCounts?.issueRecords ?? 0) > 0;

  return (
    <div className={`${dashboardPanel} px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400`}>
      {loading ? (
        <span>Loading enriched issues…</span>
      ) : (
        <div className="flex flex-col gap-2">
          <p>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{total.toLocaleString()}</span>{" "}
            matching · showing <span className="font-semibold">{itemsOnPage}</span> on this page
            {dbCounts ? (
              <>
                {" "}
                · <span className="font-medium">{dbCounts.issueRecords}</span> issues in database ·{" "}
                <span className="font-medium">{dbCounts.devices}</span> linked devices
              </>
            ) : null}
          </p>
          {active.length > 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Active filters: {active.join(" · ")}</p>
          ) : null}
          {dateHidesAll ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Date filter excludes all loaded issues. Set Date to <strong>All time</strong> to view records.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
