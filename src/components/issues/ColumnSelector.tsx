"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardInput } from "@/components/issues/dashboard-ui";

export type ColumnOption = {
  key: string;
  label: string;
  group: string;
  locked?: boolean;
};

type ColumnSelectorProps = {
  columns: ColumnOption[];
  visibleKeys: Set<string>;
  onToggleColumn: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetDefaults: () => void;
  isColumnLocked?: (key: string) => boolean;
};

export function ColumnSelector({
  columns,
  visibleKeys,
  onToggleColumn,
  onShowAll,
  onHideAll,
  onResetDefaults,
  isColumnLocked,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleCount = columns.reduce((n, c) => (visibleKeys.has(c.key) ? n + 1 : n), 0);

  const columnsByGroup = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? columns.filter(
          (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
        )
      : columns;
    const map = new Map<string, ColumnOption[]>();
    for (const col of filtered) {
      const list = map.get(col.group) ?? [];
      list.push(col);
      map.set(col.group, list);
    }
    return [...map.entries()];
  }, [columns, search]);

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        Columns
        <span className="text-zinc-500 dark:text-zinc-400" suppressHydrationWarning>
          ({visibleCount})
        </span>
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close columns menu"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 z-40 mt-2 flex max-h-[min(24rem,70vh)] w-80 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-zinc-200/80 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-950">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Columns</span>
                <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search columns…"
                className={dashboardInput}
              />

              <div className="mt-2 flex flex-wrap gap-1">
                <Button variant="outline" size="xs" onClick={onShowAll}>
                  Show all
                </Button>
                <Button variant="outline" size="xs" onClick={onHideAll}>
                  Hide all
                </Button>
                <Button variant="outline" size="xs" onClick={onResetDefaults}>
                  Reset defaults
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {columnsByGroup.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-zinc-500">No columns match</p>
              ) : (
                columnsByGroup.map(([group, cols]) => (
                  <div key={group} className="mb-2 last:mb-0">
                    <div className="sticky top-0 z-10 bg-white px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
                      {group}
                    </div>
                    {cols.map((c) => {
                      const locked = isColumnLocked?.(c.key) ?? c.locked ?? false;
                      const checked = visibleKeys.has(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            if (!locked) onToggleColumn(c.key);
                          }}
                          className={[
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                            locked
                              ? "cursor-default opacity-60"
                              : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900",
                          ].join(" ")}
                        >
                          <Checkbox checked={checked} disabled={locked} readOnly tabIndex={-1} aria-hidden />
                          <span className="truncate text-zinc-800 dark:text-zinc-100">
                            {c.label}
                            {locked ? " · required" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
