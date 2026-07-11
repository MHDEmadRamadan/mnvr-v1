"use client";

import { useId } from "react";
import { FieldShell, inputClass } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  required,
  className,
  rows = 3,
  hideLabel = false,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  rows?: number;
  hideLabel?: boolean;
  fieldKey?: string;
}) {
  const controlId = useId();

  return (
    <FieldShell
      label={label}
      error={error}
      required={required}
      className={className}
      hideLabel={hideLabel}
      fieldKey={fieldKey}
      controlId={controlId}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={inputClass(error)}
        {...fieldControlAriaProps(controlId, error)}
      />
    </FieldShell>
  );
}
