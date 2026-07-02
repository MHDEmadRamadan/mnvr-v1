"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { filterComboboxOptions } from "@/lib/combobox-filter";
import { FieldShell, inputClass } from "@/components/form/FieldShell";

type ComboboxFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  allowCustom?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export function ComboboxField({
  label,
  value,
  options,
  onChange,
  onCommit,
  allowCustom = true,
  error,
  hint,
  required,
  placeholder,
  className,
}: ComboboxFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);

  // Sync the external value into local query state during render (no effect needed).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const filtered = filterComboboxOptions(options, query);
  const exactMatch = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());
  const canCreate = allowCustom && query.trim() !== "" && !exactMatch;

  const commit = useCallback(
    (next: string) => {
      onChange(next);
      onCommit?.(next);
      setQuery(next);
      setOpen(false);
    },
    [onChange, onCommit],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const listItems = canCreate ? [...filtered, `__create__:${query.trim()}`] : filtered;

  function selectIndex(index: number) {
    const item = listItems[index];
    if (!item) return;
    if (item.startsWith("__create__:")) {
      commit(item.slice("__create__:".length));
    } else {
      commit(item);
    }
  }

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <div ref={rootRef} className="relative">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder ?? "Search or type…"}
          className={inputClass(error)}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, Math.max(0, listItems.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && listItems.length > 0) selectIndex(highlight);
              else if (query.trim()) commit(query.trim());
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onBlur={() => {
            if (query.trim()) onCommit?.(query.trim());
          }}
        />
        {open && listItems.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
          >
            {listItems.map((item, index) => {
              const isCreate = item.startsWith("__create__:");
              const labelText = isCreate ? `Add "${item.slice("__create__:".length)}"` : item;
              return (
                <li
                  key={`${item}-${index}`}
                  role="option"
                  aria-selected={index === highlight}
                  className={[
                    "cursor-pointer px-3 py-2 text-sm",
                    index === highlight
                      ? "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100"
                      : "text-zinc-800 dark:text-zinc-200",
                    isCreate ? "border-t border-zinc-100 font-medium dark:border-zinc-800" : "",
                  ].join(" ")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectIndex(index);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {labelText}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}
