"use client";

import { useId } from "react";
import { FieldShell, inputClass, type FieldShellVariant } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

export function EnumField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  className,
  fieldKey,
  variant = "dashboard",
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  fieldKey?: string;
  variant?: FieldShellVariant;
}) {
  const controlId = useId();
  const displayOptions: T[] = options.includes(value as T) ? [...options] : [...options, value as T];

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
      fieldKey={fieldKey}
      controlId={controlId}
      variant={variant}
    >
      <select
        className={inputClass(error, variant)}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        {...fieldControlAriaProps(controlId, error)}
      >
        {displayOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
