"use client";

import { Button } from "@/components/ui/button";
import { dashboardInput } from "@/components/issues/dashboard-ui";

type IssuesToolbarProps = {
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  hasActiveFilters: boolean;
  exportDisabled?: boolean;
};

export function IssuesToolbar({
  globalSearch,
  onGlobalSearchChange,
  onClearFilters,
  onExportCsv,
  selectedCount,
  onBulkDelete,
  hasActiveFilters,
  exportDisabled,
}: IssuesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
        <input
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          placeholder="Search all visible fields…"
          className={`${dashboardInput} pl-9`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            Delete {selectedCount} selected
          </Button>
        ) : null}

        {hasActiveFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}

        <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={exportDisabled}>
          Export CSV
        </Button>
      </div>
    </div>
  );
}
