"use client";

import type { ActiveFilterChip, IssuesFilterState } from "@/lib/issue-filters";

type ActiveFilterChipsProps = {
  state: IssuesFilterState;
  chips: ActiveFilterChip[];
  onRemoveChip: (chip: ActiveFilterChip) => void;
  onEditField: (fieldId: ActiveFilterChip["fieldId"]) => void;
  onClearAll: () => void;
};

export function ActiveFilterChips({
  chips,
  onRemoveChip,
  onEditField,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`Active filters: ${chips.length}`}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <button
            type="button"
            className="truncate text-left hover:underline"
            onClick={() => onEditField(chip.fieldId)}
            title="Edit filter"
          >
            <span className="font-medium">{chip.label}</span>
            <span className="text-zinc-400">: </span>
            <span>{chip.value}</span>
          </button>
          <button
            type="button"
            className="rounded-full px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={`Remove ${chip.label} ${chip.value}`}
            onClick={() => onRemoveChip(chip)}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
}
