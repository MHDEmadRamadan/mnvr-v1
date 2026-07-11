"use client";

import { FieldShell, inputClass } from "@/components/form/FieldShell";

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  required,
  className,
  rows = 3,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  rows?: number;
  hideLabel?: boolean;
}) {
  return (
    <FieldShell
      label={label}
      error={error}
      required={required}
      className={className}
      hideLabel={hideLabel}
    >
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={inputClass(error)} />
    </FieldShell>
  );
}
