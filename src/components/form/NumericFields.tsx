"use client";

import { useId } from "react";
import { FieldShell, inputClass } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

export function IntField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  min = 0,
  fieldKey,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  min?: number;
  fieldKey?: string;
}) {
  const controlId = useId();

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
        {...fieldControlAriaProps(controlId, error)}
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
  fieldKey,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  fieldKey?: string;
}) {
  const controlId = useId();
  const display = value === null ? "" : String(value);

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
        {...fieldControlAriaProps(controlId, error)}
      />
    </FieldShell>
  );
}
