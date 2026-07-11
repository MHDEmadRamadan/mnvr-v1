"use client";

import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";
import type { MaintenanceFormFieldConfig } from "@/config/maintenance-form-config";
import { ComboboxField } from "@/components/form/ComboboxField";
import { TextField } from "@/components/form/TextField";
import { TextAreaField } from "@/components/form/TextAreaField";
import { IntField, FloatField } from "@/components/form/NumericFields";
import { BoolField } from "@/components/form/BoolField";
import { EnumField } from "@/components/form/EnumField";
import { ReplacementChangeToggleField } from "@/components/form/ReplacementChangeToggleField";

type FormFieldRendererProps = {
  field: MaintenanceFormFieldConfig;
  values: MaintenanceRecordFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<MaintenanceRecordFormValues>) => void;
  getComboboxOptions: (field: MaintenanceFormFieldConfig, currentValue?: string | null) => string[];
};

export function FormFieldRenderer({
  field,
  values,
  errors,
  onChange,
  getComboboxOptions,
}: FormFieldRendererProps) {
  const error = errors[field.key];
  const set =
    <K extends keyof MaintenanceRecordFormValues>(key: K) =>
    (value: MaintenanceRecordFormValues[K]) =>
      onChange({ [key]: value });

  switch (field.type) {
    case "text":
      return (
        <TextField
          label={field.label}
          value={values[field.key] as string}
          onChange={set(field.key) as (v: string) => void}
          error={error}
          required={field.required}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          className={field.className}
        />
      );

    case "textarea":
      return (
        <TextAreaField
          label={field.label}
          value={values[field.key] as string}
          onChange={set(field.key) as (v: string) => void}
          error={error}
          required={field.required}
          className={field.className}
          hideLabel={field.hideLabel}
        />
      );

    case "combobox": {
      const strValue = values[field.key] as string;
      const options = getComboboxOptions(field, strValue);
      return (
        <ComboboxField
          label={field.label}
          value={strValue}
          options={options}
          onChange={set(field.key) as (v: string) => void}
          allowCustom={field.allowCustom ?? true}
          error={error}
          required={field.required}
          placeholder={field.placeholder}
          className={field.className}
        />
      );
    }

    case "boolean":
      return (
        <BoolField
          label={field.label}
          checked={values[field.key] as boolean}
          onChange={set(field.key) as (v: boolean) => void}
          className={field.className}
        />
      );

    case "replacement-change":
      return (
        <ReplacementChangeToggleField
          label={field.label}
          value={values[field.key] as string | null}
          onChange={set(field.key) as (v: string | null) => void}
          placeholder={field.placeholder}
          error={error}
          className={field.className}
        />
      );

    case "enum":
      return (
        <EnumField
          label={field.label}
          value={values[field.key] as string}
          options={field.enumOptions ?? []}
          onChange={set(field.key) as (v: string) => void}
          error={error}
          required={field.required}
          className={field.className}
        />
      );

    case "int":
      return (
        <IntField
          label={field.label}
          value={values[field.key] as number}
          onChange={set(field.key) as (v: number) => void}
          error={error}
          required={field.required}
          className={field.className}
        />
      );

    case "float":
      return (
        <FloatField
          label={field.label}
          value={values[field.key] as number | null}
          onChange={set(field.key) as (v: number | null) => void}
          error={error}
          required={field.required}
          className={field.className}
        />
      );

    default:
      return null;
  }
}
