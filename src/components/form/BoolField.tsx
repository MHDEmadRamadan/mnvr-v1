"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function BoolField({
  label,
  checked,
  onChange,
  error,
  className,
  fieldKey,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  className?: string;
  fieldKey?: string;
}) {
  const controlId = useId();
  const errorId = error ? `${controlId}-error` : undefined;
  const hasError = Boolean(error);

  return (
    <div className={className} data-field-key={fieldKey}>
      <label
        htmlFor={controlId}
        className={[
          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
          hasError
            ? "border-red-500 bg-red-50/50 ring-1 ring-red-500/30 dark:border-red-600 dark:bg-red-950/20 dark:ring-red-900/40"
            : "border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40",
        ].join(" ")}
      >
        <Checkbox
          id={controlId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={hasError || undefined}
          aria-describedby={errorId}
        />
        <span
          className={[
            "text-sm",
            hasError ? "text-red-700 dark:text-red-300" : "text-zinc-800 dark:text-zinc-200",
          ].join(" ")}
        >
          {label}
        </span>
      </label>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
