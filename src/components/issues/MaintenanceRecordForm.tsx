"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";
import {
  MAINTENANCE_FIELD_SECTION_MAP,
  MAINTENANCE_FORM_SECTIONS,
  fieldsForSection,
  type MaintenanceFormSectionId,
  type MaintenanceFormFieldConfig,
} from "@/config/maintenance-form-config";
import { FormFieldRenderer } from "@/components/form/FormFieldRenderer";
import { dashboardPanel } from "@/components/issues/dashboard-ui";
import { getSectionsWithErrors, scrollAndFocusField } from "@/lib/form-validation";

type MaintenanceRecordFormProps = {
  values: MaintenanceRecordFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<MaintenanceRecordFormValues>) => void;
  getComboboxOptions: (field: MaintenanceFormFieldConfig, currentValue?: string | null) => string[];
  suggestionsLoading?: boolean;
  suggestionsError?: string | null;
  /** Set on failed submit to expand sections, scroll, and focus the first invalid field. */
  focusErrorKey?: string | null;
  onFocusErrorHandled?: () => void;
};

function countSectionErrors(
  sectionId: MaintenanceFormSectionId,
  errors: Record<string, string>,
): number {
  return fieldsForSection(sectionId).filter((field) => errors[field.key]).length;
}

export function MaintenanceRecordForm({
  values,
  errors,
  onChange,
  getComboboxOptions,
  suggestionsLoading,
  suggestionsError,
  focusErrorKey,
  onFocusErrorHandled,
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

  const errorCount = Object.keys(errors).length;

  const sectionsWithErrors = useMemo(
    () => getSectionsWithErrors(errors, MAINTENANCE_FIELD_SECTION_MAP),
    [errors],
  );

  const effectiveOpenSections = useMemo(() => {
    const next = new Set(openSections);
    for (const section of sectionsWithErrors) {
      next.add(section as MaintenanceFormSectionId);
    }
    return next;
  }, [openSections, sectionsWithErrors]);

  useEffect(() => {
    if (!focusErrorKey) return;

    const timer = window.setTimeout(() => {
      scrollAndFocusField(focusErrorKey);
      onFocusErrorHandled?.();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [focusErrorKey, onFocusErrorHandled]);

  return (
    <div className="space-y-3">
      {errorCount > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorCount === 1
            ? "1 field needs your attention before saving."
            : `${errorCount} fields need your attention before saving.`}
        </div>
      ) : null}

      {suggestionsLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" role="status">
          Loading field suggestions…
        </p>
      ) : null}
      {suggestionsError ? (
        <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
          Suggestions unavailable: {suggestionsError}. You can still type custom values.
        </p>
      ) : null}

      {MAINTENANCE_FORM_SECTIONS.map((section) => {
        const open = effectiveOpenSections.has(section.id);
        const panelId = `${baseId}-${section.id}`;
        const fields = fieldsForSection(section.id);
        const sectionErrorCount = countSectionErrors(section.id, errors);

        return (
          <div key={section.id} className={`${dashboardPanel} overflow-hidden`}>
            <button
              type="button"
              id={`${panelId}-trigger`}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleSection(section.id)}
              className={[
                "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition-colors",
                sectionErrorCount > 0
                  ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/20"
                  : "text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/60",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {section.title}
                {sectionErrorCount > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {sectionErrorCount} {sectionErrorCount === 1 ? "error" : "errors"}
                  </span>
                ) : null}
              </span>
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
