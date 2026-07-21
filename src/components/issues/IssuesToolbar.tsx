"use client";

import { Button } from "@/components/ui/button";

type IssuesToolbarProps = {
  onClearFilters: () => void;
  onExportCsv: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  hasActiveFilters: boolean;
  exportDisabled?: boolean;
  canDelete?: boolean;
};

export function IssuesToolbar({
  onClearFilters,
  onExportCsv,
  selectedCount,
  onBulkDelete,
  hasActiveFilters,
  exportDisabled,
  canDelete = false,
}: IssuesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:justify-end">
      <div className="flex flex-wrap items-center gap-2">
        {canDelete && selectedCount > 0 ? (
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
