"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldShell, inputClass } from "@/components/form/FieldShell";

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
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  const changed = value !== null;

  return (
    <div className={["space-y-2", className ?? ""].join(" ")}>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
        <Checkbox
          checked={changed}
          onChange={(e) => {
            if (e.target.checked) onChange(value ?? "");
            else onChange(null);
          }}
        />
        <span className="text-sm text-zinc-800 dark:text-zinc-200">{label}</span>
      </label>
      {changed ? (
        <FieldShell label={`${label} — replacement value`} error={error}>
          <input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
            placeholder={placeholder ?? "Enter replacement value"}
            autoComplete="off"
            className={inputClass(error)}
          />
        </FieldShell>
      ) : null}
    </div>
  );
}
