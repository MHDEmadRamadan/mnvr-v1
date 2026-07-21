"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { filterComboboxOptions } from "@/lib/combobox-filter";
import { FieldShell, inputClass } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

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
  fieldKey?: string;
};

/** Dropdown list z-index — above IssueModal (z-50) and accordion panels (overflow-hidden). */
const LISTBOX_Z_INDEX = 200;

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
  fieldKey,
}: ComboboxFieldProps) {
  const controlId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [listRect, setListRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const query = draft ?? value;
  const filtered = filterComboboxOptions(options, query);
  const exactMatch = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());
  const canCreate = allowCustom && query.trim() !== "" && !exactMatch;
  const listItems = canCreate ? [...filtered, `__create__:${query.trim()}`] : filtered;
  const canPortal = typeof document !== "undefined";

  const commit = useCallback(
    (next: string) => {
      onChange(next);
      onCommit?.(next);
      setDraft(null);
      setOpen(false);
      setListRect(null);
    },
    [onChange, onCommit],
  );

  const updateListPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setListRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateListPosition();
    const onReposition = () => updateListPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updateListPosition, query, listItems.length]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
      setListRect(null);
      setDraft(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectIndex(index: number) {
    const item = listItems[index];
    if (!item) return;
    if (item.startsWith("__create__:")) {
      commit(item.slice("__create__:".length));
    } else {
      commit(item);
    }
  }

  const listbox =
    open && listItems.length > 0 && listRect && canPortal
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: listRect.top,
              left: listRect.left,
              width: listRect.width,
              zIndex: LISTBOX_Z_INDEX,
            }}
            className="max-h-52 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
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
          </ul>,
          document.body,
        )
      : null;

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
      fieldKey={fieldKey}
      controlId={controlId}
    >
      <div ref={rootRef} className="relative">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder ?? "Search or type…"}
          className={inputClass(error)}
          {...fieldControlAriaProps(controlId, error)}
          onFocus={() => {
            setOpen(true);
            updateListPosition();
          }}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onChange(next);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              updateListPosition();
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
              setListRect(null);
              setDraft(null);
            }
          }}
          onBlur={() => {
            if (query.trim()) onCommit?.(query.trim());
          }}
        />
      </div>
      {listbox}
    </FieldShell>
  );
}
