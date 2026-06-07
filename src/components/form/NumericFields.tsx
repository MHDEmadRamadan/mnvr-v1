"use client";

import { FieldShell, inputClass } from "@/components/form/FieldShell";

export function IntField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  min?: number;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <input
        type="number"
        step={1}
        min={min}
        value={String(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(min, n) : min);
        }}
        className={inputClass(error)}
      />
    </FieldShell>
  );
}

export function FloatField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  const display = value === null ? "" : String(value);
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <input
        type="number"
        step="any"
        value={display}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = parseFloat(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className={inputClass(error)}
      />
    </FieldShell>
  );
}
