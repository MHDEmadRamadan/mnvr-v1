"use client";

import { useCallback, useId, useState } from "react";
import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";
import {
  MAINTENANCE_FORM_SECTIONS,
  fieldsForSection,
  type MaintenanceFormSectionId,
  type MaintenanceFormFieldConfig,
} from "@/config/maintenance-form-config";
import { FormFieldRenderer } from "@/components/form/FormFieldRenderer";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

type MaintenanceRecordFormProps = {
  values: MaintenanceRecordFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<MaintenanceRecordFormValues>) => void;
  getComboboxOptions: (field: MaintenanceFormFieldConfig, currentValue?: string | null) => string[];
  suggestionsLoading?: boolean;
  suggestionsError?: string | null;
};

export function MaintenanceRecordForm({
  values,
  errors,
  onChange,
  getComboboxOptions,
  suggestionsLoading,
  suggestionsError,
}: MaintenanceRecordFormProps) {
  const baseId = useId();
  const [openSections, setOpenSections] = useState<Set<MaintenanceFormSectionId>>(
    () => new Set(["vehicle"]),
  );

  const toggleSection = useCallback((id: MaintenanceFormSectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      {suggestionsLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" role="status">
          Loading field suggestions…
        </p>
      ) : null}
      {suggestionsError ? (
        <p className="text-xs text-amber-600 dark:text-amber-400" role="alert">
          Suggestions unavailable: {suggestionsError}. You can still type custom values.
        </p>
      ) : null}

      {MAINTENANCE_FORM_SECTIONS.map((section) => {
        const open = openSections.has(section.id);
        const panelId = `${baseId}-${section.id}`;
        const fields = fieldsForSection(section.id);

        return (
          <div key={section.id} className={`${dashboardPanel} overflow-hidden`}>
            <button
              type="button"
              id={`${panelId}-trigger`}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/60"
            >
              {section.title}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {open ? "Hide" : "Show"}
              </span>
            </button>
            {open ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={`${panelId}-trigger`}
                className="border-t border-zinc-200/80 px-4 py-4 dark:border-zinc-800"
              >
                {section.description ? (
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{section.description}</p>
                ) : null}
                <div className={section.gridClassName}>
                  {fields.map((field) => (
                    <FormFieldRenderer
                      key={field.key}
                      field={field}
                      values={values}
                      errors={errors}
                      onChange={onChange}
                      getComboboxOptions={getComboboxOptions}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
