"use client";

import type { IssuesFilterState } from "@/lib/issue-filters";
import { ColumnSelector, type ColumnOption } from "@/components/issues/ColumnSelector";
import { dashboardInput, dashboardSelect } from "@/components/issues/dashboard-ui";

export type { IssuesFilterState };

type IssueFiltersProps = {
  value: IssuesFilterState;
  onChange: (next: IssuesFilterState) => void;
  columns: ColumnOption[];
  visibleKeys: Set<string>;
  onToggleColumn: (key: string) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  onResetColumns: () => void;
  isColumnLocked?: (key: string) => boolean;
};

export function IssueFilters({
  value,
  onChange,
  columns,
  visibleKeys,
  onToggleColumn,
  onShowAllColumns,
  onHideAllColumns,
  onResetColumns,
  isColumnLocked,
}: IssueFiltersProps) {
  return (
    <div className="p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Filters
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Issue type</div>
            <input
              value={value.issueType}
              onChange={(e) => onChange({ ...value, issueType: e.target.value })}
              placeholder="e.g. hardware"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Vehicle</div>
            <input
              value={value.vehicleNumber}
              onChange={(e) => onChange({ ...value, vehicleNumber: e.target.value })}
              placeholder="Vehicle number"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">IMEI</div>
            <input
              value={value.deviceImei}
              onChange={(e) => onChange({ ...value, deviceImei: e.target.value })}
              placeholder="Device IMEI"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Flespi status</div>
            <input
              value={value.flespiStatus}
              onChange={(e) => onChange({ ...value, flespiStatus: e.target.value })}
              placeholder="e.g. online"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Screen status</div>
            <input
              value={value.screenStatus}
              onChange={(e) => onChange({ ...value, screenStatus: e.target.value })}
              placeholder="e.g. ok"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Issue source</div>
            <input
              value={value.issueSource}
              onChange={(e) => onChange({ ...value, issueSource: e.target.value })}
              placeholder="e.g. monitoring"
              className={dashboardInput}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Date</div>
            <select
              value={value.dateMode}
              onChange={(e) => onChange({ ...value, dateMode: e.target.value as IssuesFilterState["dateMode"] })}
              className={dashboardSelect}
            >
              <option value="all">All time</option>
              <option value="current_month">Current month</option>
              <option value="range">Custom range</option>
            </select>
          </label>

          {value.dateMode === "range" ? (
            <>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">From</div>
                <input
                  type="date"
                  value={value.fromDate}
                  onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
                  className={dashboardInput}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">To</div>
                <input
                  type="date"
                  value={value.toDate}
                  onChange={(e) => onChange({ ...value, toDate: e.target.value })}
                  className={dashboardInput}
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-end">
          <ColumnSelector
            columns={columns}
            visibleKeys={visibleKeys}
            onToggleColumn={onToggleColumn}
            onShowAll={onShowAllColumns}
            onHideAll={onHideAllColumns}
            onResetDefaults={onResetColumns}
            isColumnLocked={isColumnLocked}
          />
        </div>
      </div>
    </div>
  );
}
