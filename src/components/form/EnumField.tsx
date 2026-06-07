"use client";

import { FieldShell, inputClass } from "@/components/form/FieldShell";

export function EnumField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  const displayOptions: T[] = options.includes(value as T) ? [...options] : [...options, value as T];

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      <select className={inputClass(error)} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {displayOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
