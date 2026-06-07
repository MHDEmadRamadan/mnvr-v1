"use client";

import { FieldShell, inputClass } from "@/components/form/FieldShell";

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  rows?: number;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={inputClass(error)} />
    </FieldShell>
  );
}
