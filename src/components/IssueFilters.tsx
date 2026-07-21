"use client";

import { useMemo, useState } from "react";
import {
  countActiveFilters,
  defaultFilterState,
  getActiveFilterChips,
  removeFilterChip,
  type ActiveFilterChip,
  type IssuesFilterState,
} from "@/lib/issue-filters";
import {
  ADVANCED_ISSUE_FILTER_FIELDS,
  ISSUE_FILTER_CATEGORY_LABELS,
  ISSUE_FILTER_CATEGORY_ORDER,
  PRIMARY_ISSUE_FILTER_IDS,
  type IssueFilterFieldId,
} from "@/config/issue-filter-catalog";
import { ColumnSelector, type ColumnOption } from "@/components/issues/ColumnSelector";
import { ActiveFilterChips } from "@/components/issues/filters/ActiveFilterChips";
import { FilterValueControl } from "@/components/issues/filters/FilterValueControl";
import { MultiSelectFilter } from "@/components/issues/filters/MultiSelectFilter";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { dashboardBtnSecondary, dashboardInput } from "@/components/issues/dashboard-ui";

export type { IssuesFilterState };

const PREFERRED_ISSUE_TYPE_OPTIONS = [
  "LV",
  "PMM Issue",
  "Motherboard Issue",
  "SSD Issue",
  "SIM Issue",
  "Camera Issue",
  "Power Issue",
  "Software Issue",
  "Other Issue",
] as const;

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

function focusFilterControl(fieldId: IssueFilterFieldId) {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-filter-field="${fieldId}"]`)?.focus();
  });
}

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
  const chips = useMemo(() => getActiveFilterChips(value), [value]);
  // Issue Type selections already render as compact chips inside their control.
  const toolbarChips = useMemo(
    () => chips.filter((chip) => chip.fieldId !== "issueType"),
    [chips],
  );
  const activeCount = useMemo(() => countActiveFilters(value), [value]);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ISSUE_FILTER_CATEGORY_ORDER.map((c) => [c, true])),
  );

  const activeAdvancedCount = useMemo(
    () =>
      ADVANCED_ISSUE_FILTER_FIELDS.filter((f) =>
        chips.some((chip) => chip.fieldId === f.id),
      ).length,
    [chips],
  );

  const groupedAdvanced = useMemo(
    () =>
      ISSUE_FILTER_CATEGORY_ORDER.map((category) => ({
        category,
        label: ISSUE_FILTER_CATEGORY_LABELS[category],
        fields: ADVANCED_ISSUE_FILTER_FIELDS.filter((f) => f.category === category),
      })).filter((g) => g.fields.length > 0),
    [],
  );

  const clearAll = () => onChange(defaultFilterState());
  const resetFilters = () => {
    onChange(defaultFilterState());
    setAdvancedOpen(false);
  };

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    onChange(removeFilterChip(value, chip));
  };

  const handleEditField = (fieldId: IssueFilterFieldId) => {
    if (!PRIMARY_ISSUE_FILTER_IDS.includes(fieldId)) {
      setAdvancedOpen(true);
      const field = ADVANCED_ISSUE_FILTER_FIELDS.find((f) => f.id === fieldId);
      if (field) setOpenSections((prev) => ({ ...prev, [field.category]: true }));
    }
    focusFilterControl(fieldId);
  };

  const primaryBar = (
    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="block xl:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Search</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
          <input
            value={value.globalSearch}
            onChange={(e) => onChange({ ...value, globalSearch: e.target.value })}
            placeholder="Vehicle, IMEI, tickets, issues, types…"
            className={`${dashboardInput} pl-9`}
            aria-label="Search"
            data-filter-field="globalSearch"
          />
        </div>
      </label>

      <FilterValueControl fieldId="date" state={value} onChange={onChange} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Vehicle Number</span>
        <MultiSelectFilter
          values={value.vehicleNumber}
          onChange={(next) => onChange({ ...value, vehicleNumber: next })}
          placeholder="Select vehicles…"
          suggestionField="vehicle_number"
          aria-label="Vehicle Number"
          data-filter-field="vehicleNumber"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">IMEI</span>
        <MultiSelectFilter
          values={value.deviceImei}
          onChange={(next) => onChange({ ...value, deviceImei: next })}
          placeholder="Select IMEIs…"
          suggestionField="imei"
          aria-label="IMEI"
          data-filter-field="deviceImei"
        />
      </label>

      <label className="block sm:col-span-2 xl:col-span-1">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Issue Type</span>
        <MultiSelectFilter
          values={value.issueType}
          onChange={(next) => onChange({ ...value, issueType: next })}
          placeholder="Select types…"
          suggestionField="issue_type"
          preferredOptions={PREFERRED_ISSUE_TYPE_OPTIONS}
          aria-label="Issue Type"
          data-filter-field="issueType"
        />
      </label>
    </div>
  );

  const advancedPanel = (
    <div className="space-y-2">
      {groupedAdvanced.map((group) => {
        const open = openSections[group.category] !== false;
        return (
          <section
            key={group.category}
            className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between bg-zinc-50 px-3 py-2 text-left text-sm font-medium text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100"
              aria-expanded={open}
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, [group.category]: !open }))
              }
            >
              <span>{group.label}</span>
              <span className="text-xs text-zinc-400">{open ? "−" : "+"}</span>
            </button>
            {open ? (
              <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <FilterValueControl
                    key={field.id}
                    fieldId={field.id}
                    state={value}
                    onChange={onChange}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${dashboardBtnSecondary} lg:hidden`}
            onClick={() => setMobileOpen(true)}
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <button
            type="button"
            className={`${dashboardBtnSecondary} hidden lg:inline-flex`}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? "Collapse Advanced Filters" : "Advanced Filters"}
            {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
          </button>
          {activeCount > 0 ? (
            <>
              <button type="button" className={dashboardBtnSecondary} onClick={clearAll}>
                Clear All
              </button>
              <button type="button" className={dashboardBtnSecondary} onClick={resetFilters}>
                Reset Filters
              </button>
            </>
          ) : null}
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

      <div className="hidden lg:block">
        {primaryBar}
        {advancedOpen ? (
          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Advanced Filters</div>
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setAdvancedOpen(false)}
              >
                Collapse Advanced Filters
              </button>
            </div>
            {advancedPanel}
          </div>
        ) : null}
        <div className="mt-3">
          <ActiveFilterChips
            state={value}
            chips={toolbarChips}
            onRemoveChip={handleRemoveChip}
            onEditField={handleEditField}
            onClearAll={clearAll}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <ActiveFilterChips
          state={value}
          chips={toolbarChips}
          onRemoveChip={handleRemoveChip}
          onEditField={() => setMobileOpen(true)}
          onClearAll={clearAll}
        />
        <p className="mt-2 text-xs text-zinc-500">Open Filters for search and advanced fields.</p>
      </div>

      <Sheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Filters"
        description="Search and refine the issues list"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={clearAll}>
              Clear All
            </Button>
            <Button variant="secondary" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={() => setMobileOpen(false)}>Done</Button>
          </div>
        }
      >
        <div className="space-y-6">
          {primaryBar}
          <div>
            <div className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">Advanced Filters</div>
            {advancedPanel}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
