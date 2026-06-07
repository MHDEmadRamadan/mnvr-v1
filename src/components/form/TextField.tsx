"use client";

import { FieldShell, inputClass } from "@/components/form/FieldShell";

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  autoComplete,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass(error)}
      />
    </FieldShell>
  );
}
