"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { filterComboboxOptions } from "@/lib/combobox-filter";
import { getFieldSuggestions } from "@/lib/form-suggestions/suggestions-client";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardInput } from "@/components/issues/dashboard-ui";
import type { FormSuggestionFieldName } from "@/lib/form-suggestions/field-map";

type FloatingPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type MultiSelectFilterProps = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestionField?: FormSuggestionFieldName;
  preferredOptions?: readonly string[];
  maxVisibleChips?: number;
  autoFocus?: boolean;
  "aria-label"?: string;
  "data-filter-field"?: string;
};

function uniqueOptions(...groups: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of groups) {
    for (const raw of group) {
      const value = raw.trim();
      const normalized = value.toLocaleLowerCase();
      if (!value || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(value);
    }
  }
  return result;
}

export function MultiSelectFilter({
  values,
  onChange,
  placeholder,
  suggestionField,
  preferredOptions = [],
  maxVisibleChips = 2,
  autoFocus,
  "aria-label": ariaLabel,
  "data-filter-field": dataFilterField,
}: MultiSelectFilterProps) {
  const { getAccessToken } = useAuth();
  const listId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [fetchedOptions, setFetchedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const loadedRef = useRef(false);

  const normalizedValues = useMemo(() => uniqueOptions(values), [values]);
  const selected = useMemo(
    () => new Set(normalizedValues.map((value) => value.toLocaleLowerCase())),
    [normalizedValues],
  );
  const options = useMemo(
    () => uniqueOptions(preferredOptions, fetchedOptions, normalizedValues),
    [fetchedOptions, normalizedValues, preferredOptions],
  );
  const filtered = useMemo(
    () => filterComboboxOptions(options, query),
    [options, query],
  );
  const activeIndex = Math.min(highlight, Math.max(0, filtered.length - 1));
  const visibleChips = normalizedValues.slice(0, maxVisibleChips);
  const hiddenChipCount = Math.max(0, normalizedValues.length - visibleChips.length);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mobile = viewportWidth < 640;
    const gap = 6;
    const horizontalMargin = mobile ? 12 : 8;
    const width = mobile
      ? viewportWidth - horizontalMargin * 2
      : rect.width;
    const left = mobile
      ? horizontalMargin
      : Math.min(
          Math.max(horizontalMargin, rect.left),
          viewportWidth - width - horizontalMargin,
        );
    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const desiredHeight = 360;
    const placeAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, Math.min(desiredHeight, placeAbove ? spaceAbove : spaceBelow));
    const top = placeAbove
      ? Math.max(gap, rect.top - maxHeight - gap)
      : Math.min(viewportHeight - maxHeight - gap, rect.bottom + gap);

    setPosition({ left, top, width, maxHeight });
  }, []);

  const closeDropdown = useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const toggleValue = useCallback(
    (value: string) => {
      const normalized = value.toLocaleLowerCase();
      if (selected.has(normalized)) {
        onChange(
          normalizedValues.filter(
            (item) => item.toLocaleLowerCase() !== normalized,
          ),
        );
      } else {
        onChange(uniqueOptions(normalizedValues, [value]));
      }
    },
    [normalizedValues, onChange, selected],
  );

  const removeValue = useCallback(
    (value: string) => {
      const normalized = value.toLocaleLowerCase();
      onChange(
        normalizedValues.filter(
          (item) => item.toLocaleLowerCase() !== normalized,
        ),
      );
    },
    [normalizedValues, onChange],
  );

  useEffect(() => {
    if (!open || !suggestionField || loadedRef.current) return;
    let cancelled = false;
    setLoading(true);
    void getFieldSuggestions(getAccessToken, suggestionField)
      .then((next) => {
        if (!cancelled) {
          setFetchedOptions(next);
          loadedRef.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, open, suggestionField]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.requestAnimationFrame(() => searchRef.current?.focus());

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        closeDropdown();
      }
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeDropdown, open, updatePosition]);

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown(true);
      return;
    }
    if (event.key === "Backspace" && !query && normalizedValues.length > 0) {
      event.preventDefault();
      removeValue(normalizedValues[normalizedValues.length - 1]);
      return;
    }
    if (filtered.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(Math.min(activeIndex + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      if (event.key === " " && query) return;
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) toggleValue(option);
    }
  };

  const dropdown =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: 100,
              animation: "filterDropdownIn 140ms ease-out",
            }}
            className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/15 dark:border-zinc-700 dark:bg-zinc-950"
            role="dialog"
            aria-label={`${ariaLabel ?? "Filter"} options`}
          >
            <style>{`
              @keyframes filterDropdownIn {
                from { opacity: 0; transform: translateY(-4px) scale(.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            <div className="flex min-h-0 w-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  Selected ({normalizedValues.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-blue-400"
                    disabled={
                      options.length === 0 ||
                      normalizedValues.length === options.length
                    }
                    onClick={() => onChange(options)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-zinc-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-300 dark:disabled:text-zinc-700"
                    disabled={normalizedValues.length === 0}
                    onClick={() => onChange([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
                <input
                  ref={searchRef}
                  value={query}
                  aria-label={`Search ${ariaLabel ?? "filter"} options`}
                  aria-controls={listId}
                  aria-activedescendant={
                    filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined
                  }
                  role="combobox"
                  aria-expanded="true"
                  autoComplete="off"
                  placeholder="Search options…"
                  className={`${dashboardInput} h-9`}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={handleListKeyDown}
                />
              </div>
              <ul
                id={listId}
                role="listbox"
                aria-multiselectable="true"
                className="min-h-0 flex-1 overflow-y-auto p-1.5 overscroll-contain"
              >
                {loading ? (
                  <li className="px-3 py-4 text-center text-xs text-zinc-500">
                    Loading options…
                  </li>
                ) : filtered.length === 0 ? (
                  <li className="px-3 py-4 text-center text-xs text-zinc-500">
                    No matching options
                  </li>
                ) : (
                  filtered.map((option, index) => {
                    const checked = selected.has(option.toLocaleLowerCase());
                    const highlighted = index === activeIndex;
                    return (
                      <li
                        id={`${listId}-${index}`}
                        key={option}
                        role="option"
                        aria-selected={checked}
                      >
                        <div
                          className={[
                            "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                            highlighted
                              ? "bg-blue-50 text-blue-950 dark:bg-blue-950/60 dark:text-blue-50"
                              : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
                          ].join(" ")}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => toggleValue(option)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            tabIndex={-1}
                            className="h-4 w-4 shrink-0 accent-blue-600"
                            aria-label={option}
                          />
                          <span className="truncate">{option}</span>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        tabIndex={0}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        data-filter-field={dataFilterField}
        className={`${dashboardInput} flex h-10 cursor-text items-center gap-1.5 overflow-hidden py-1.5 outline-none focus:ring-2 focus:ring-blue-500/40`}
        onClick={() => setOpen(true)}
        onFocus={() => {
          if (autoFocus) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            closeDropdown();
          } else if (
            event.key === "Backspace" &&
            !open &&
            normalizedValues.length > 0
          ) {
            event.preventDefault();
            removeValue(normalizedValues[normalizedValues.length - 1]);
          } else if (
            event.key === "Enter" ||
            event.key === " " ||
            event.key === "ArrowDown"
          ) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {visibleChips.map((value) => (
          <span
            key={value}
            className="inline-flex min-w-0 max-w-[8.5rem] shrink-0 items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <span className="truncate">{value}</span>
            <button
              type="button"
              className="shrink-0 text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              aria-label={`Remove ${value}`}
              onClick={(event) => {
                event.stopPropagation();
                removeValue(value);
              }}
            >
              ×
            </button>
          </span>
        ))}
        {hiddenChipCount > 0 ? (
          <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            +{hiddenChipCount} more
          </span>
        ) : null}
        {normalizedValues.length === 0 ? (
          <span className="truncate text-sm text-zinc-400">
            {placeholder ?? "Select…"}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-xs text-zinc-400" aria-hidden="true">
          ▾
        </span>
      </div>
      {dropdown}
    </div>
  );
}
