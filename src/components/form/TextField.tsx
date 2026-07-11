"use client";

import { useId } from "react";
import { FieldShell, inputClass, type FieldShellVariant } from "@/components/form/FieldShell";
import { fieldControlAriaProps } from "@/lib/form-validation";

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
  fieldKey,
  variant = "dashboard",
  type = "text",
  disabled,
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
  fieldKey?: string;
  variant?: FieldShellVariant;
  type?: "text" | "email" | "password";
  disabled?: boolean;
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
      variant={variant}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass(error, variant)}
        {...fieldControlAriaProps(controlId, error)}
      />
    </FieldShell>
  );
}
