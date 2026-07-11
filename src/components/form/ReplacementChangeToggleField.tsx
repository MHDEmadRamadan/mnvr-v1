"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldShell, inputClass } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

/**
 * Checkbox + replacement value input.
 * null = not changed (DB "false"); string = replacement IMEI/SIM.
 */
export function ReplacementChangeToggleField({
  label,
  value,
  onChange,
  placeholder,
  error,
  className,
  fieldKey,
  disabled = false,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  fieldKey?: string;
  disabled?: boolean;
}) {
  const checkboxId = useId();
  const inputId = useId();
  const changed = value !== null;
  const hasError = Boolean(error);
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={["space-y-2", className ?? ""].join(" ")} data-field-key={fieldKey}>
      <label
        htmlFor={checkboxId}
        className={[
          "flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          hasError && !changed
            ? "border-red-500 bg-red-50/50 ring-1 ring-red-500/30 dark:border-red-600 dark:bg-red-950/20"
            : "border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40",
        ].join(" ")}
      >
        <Checkbox
          id={checkboxId}
          checked={changed}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            if (e.target.checked) onChange(value ?? "");
            else onChange(null);
          }}
          aria-invalid={hasError && !changed ? true : undefined}
          aria-describedby={hasError && !changed ? errorId : undefined}
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
      {changed ? (
        <FieldShell
          label={`${label} — replacement value`}
          error={error}
          fieldKey={fieldKey ? `${fieldKey}-value` : undefined}
          controlId={inputId}
        >
          <input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
            placeholder={placeholder ?? "Enter replacement value"}
            autoComplete="off"
            disabled={disabled}
            className={inputClass(error)}
            {...fieldControlAriaProps(inputId, error)}
          />
        </FieldShell>
      ) : error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
