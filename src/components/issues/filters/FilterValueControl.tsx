"use client";

import type { IssuesFilterState } from "@/lib/issue-filters";
import { getIssueFilterField, type IssueFilterFieldId } from "@/config/issue-filter-catalog";
import { MultiSelectFilter } from "@/components/issues/filters/MultiSelectFilter";
import { dashboardInput, dashboardSelect } from "@/components/issues/dashboard-ui";

type FilterValueControlProps = {
  fieldId: IssueFilterFieldId;
  state: IssuesFilterState;
  onChange: (next: IssuesFilterState) => void;
  autoFocus?: boolean;
};

export function FilterValueControl({ fieldId, state, onChange, autoFocus }: FilterValueControlProps) {
  const field = getIssueFilterField(fieldId);
  if (!field) return null;

  const setKey = (key: keyof IssuesFilterState, value: string | string[]) => {
    onChange({ ...state, [key]: value });
  };

  if (fieldId === "date") {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[8rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Date range</span>
          <select
            autoFocus={autoFocus}
            data-filter-field={fieldId}
            value={state.dateMode}
            onChange={(e) =>
              onChange({ ...state, dateMode: e.target.value as IssuesFilterState["dateMode"] })
            }
            className={dashboardSelect}
          >
            <option value="all">All time</option>
            <option value="current_month">Current month</option>
            <option value="range">Custom range</option>
          </select>
        </label>
        {state.dateMode === "range" ? (
          <>
            <label className="block min-w-[8rem]">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">From</span>
              <input
                type="date"
                value={state.fromDate}
                onChange={(e) => setKey("fromDate", e.target.value)}
                className={dashboardInput}
              />
            </label>
            <label className="block min-w-[8rem]">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">To</span>
              <input
                type="date"
                value={state.toDate}
                onChange={(e) => setKey("toDate", e.target.value)}
                className={dashboardInput}
              />
            </label>
          </>
        ) : null}
      </div>
    );
  }

  if (field.control === "status") {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
        <select
          autoFocus={autoFocus}
          data-filter-field={fieldId}
          value={state.status}
          onChange={(e) => setKey("status", e.target.value)}
          className={dashboardSelect}
        >
          <option value="">Any</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
    );
  }

  if (field.control === "boolean") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
        <select
          autoFocus={autoFocus}
          data-filter-field={fieldId}
          value={String(state[key] ?? "")}
          onChange={(e) => setKey(key, e.target.value)}
          className={dashboardSelect}
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  if (field.control === "enum") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
        <select
          autoFocus={autoFocus}
          data-filter-field={fieldId}
          value={String(state[key] ?? "")}
          onChange={(e) => setKey(key, e.target.value)}
          className={dashboardSelect}
        >
          <option value="">Any</option>
          {(field.enumOptions ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.control === "triStateText") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    const raw = String(state[key] ?? "");
    const mode =
      raw === ""
        ? ""
        : raw === "false" || raw.toLowerCase() === "no" || raw.toLowerCase() === "no change"
          ? "false"
          : raw === "true" || raw.toLowerCase() === "yes"
            ? "true"
            : "custom";
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
          <select
            autoFocus={autoFocus && mode !== "custom"}
            data-filter-field={fieldId}
            value={mode === "custom" ? "custom" : mode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") setKey(key, "");
              else if (v === "false" || v === "true") setKey(key, v);
              else if (mode !== "custom") setKey(key, "");
            }}
            className={dashboardSelect}
          >
            <option value="">Any</option>
            <option value="false">No change</option>
            <option value="true">Has change</option>
            <option value="custom">Specific value…</option>
          </select>
        </label>
        {mode === "custom" ? (
          <input
            autoFocus={autoFocus}
            value={raw === "true" || raw === "false" ? "" : raw}
            onChange={(e) => setKey(key, e.target.value)}
            placeholder="Exact / partial value"
            className={dashboardInput}
            aria-label={`${field.label} value`}
          />
        ) : null}
      </div>
    );
  }

  if (field.control === "numericRange") {
    const minKey = field.stateKeys[0] as keyof IssuesFilterState;
    const maxKey = field.stateKeys[1] as keyof IssuesFilterState;
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {field.label} min
          </span>
          <input
            autoFocus={autoFocus}
            data-filter-field={fieldId}
            type="number"
            value={String(state[minKey] ?? "")}
            onChange={(e) => setKey(minKey, e.target.value)}
            className={dashboardInput}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {field.label} max
          </span>
          <input
            type="number"
            value={String(state[maxKey] ?? "")}
            onChange={(e) => setKey(maxKey, e.target.value)}
            className={dashboardInput}
          />
        </label>
      </div>
    );
  }

  if (field.control === "multiAutocomplete") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    const values = (state[key] as string[]) ?? [];
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
        <MultiSelectFilter
          values={values}
          onChange={(next) => setKey(key, next)}
          placeholder={field.label}
          suggestionField={field.suggestionField}
          autoFocus={autoFocus}
          aria-label={field.label}
          data-filter-field={fieldId}
        />
      </label>
    );
  }

  const key = field.stateKeys[0] as keyof IssuesFilterState;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{field.label}</span>
      <input
        autoFocus={autoFocus}
        data-filter-field={fieldId}
        value={String(state[key] ?? "")}
        onChange={(e) => setKey(key, e.target.value)}
        placeholder={field.label}
        className={dashboardInput}
        aria-label={field.label}
      />
    </label>
  );
}
