"use client";

import { useCallback, useEffect, useState } from "react";
import type { Issue, IssueCreateInput, IssueUpdateInput } from "@/types/issue";
import { emptyMaintenanceRecordForm, type MaintenanceRecordFormValues } from "@/types/maintenance-record";
import { MAINTENANCE_FORM_FIELD_ORDER } from "@/config/maintenance-form-config";
import { issueToMaintenanceForm, issueToMaintenanceUpdate } from "@/lib/issues-mapper";
import {
  validateMaintenanceRecordForm,
  validateMaintenanceRecordFields,
} from "@/lib/maintenance-record-schema";
import { applyMaintenanceFormPatch } from "@/lib/maintenance-form-patch";
import { getFirstErrorKey, reconcileFieldErrors } from "@/lib/form-validation";
import { useFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { MaintenanceRecordForm } from "@/components/issues/MaintenanceRecordForm";
import { dashboardBtnPrimary, dashboardBtnSecondary, dashboardPanel } from "@/components/issues/dashboard-ui";

export function IssueModal({
  open,
  issue,
  onClose,
  onSave,
}: {
  open: boolean;
  issue: Issue | null;
  onSave: (values: IssueCreateInput | IssueUpdateInput, editingId?: string) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!issue;
  const [values, setValues] = useState<MaintenanceRecordFormValues>(emptyMaintenanceRecordForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusErrorKey, setFocusErrorKey] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { getComboboxOptions, loading: suggestionsLoading, error: suggestionsError, refresh } =
    useFieldSuggestions(open);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset form when modal opens */
    setValues(isEdit && issue ? issueToMaintenanceForm(issue) : emptyMaintenanceRecordForm());
    setErrors({});
    setFocusErrorKey(null);
    setSubmitAttempted(false);
    setSaveSuccess(false);
  }, [open, isEdit, issue]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const handleChange = useCallback((patch: Partial<MaintenanceRecordFormValues>) => {
    setValues((prev) => {
      const next = applyMaintenanceFormPatch(prev, patch);
      if (submitAttempted) {
        const changedKeys = Object.keys(patch) as (keyof MaintenanceRecordFormValues)[];
        const fieldErrors = validateMaintenanceRecordFields(next, changedKeys);
        setErrors((prevErrors) => reconcileFieldErrors(prevErrors, fieldErrors, changedKeys));
      }
      return next;
    });
  }, [submitAttempted]);

  const handleFocusErrorHandled = useCallback(() => {
    setFocusErrorKey(null);
  }, []);

  if (!open) return null;

  const heading = isEdit ? "Edit Maintenance Record" : "Add Maintenance Record";
  const contextLabel = isEdit
    ? [issue.issueType, issue.deviceImei, issue.vehicleNumber].filter(Boolean).join(" · ") ||
      "Update all related vehicle, device, and issue fields"
    : "Create a complete maintenance record — vehicle, device, status, hardware, storage, replacements, and issue.";

  const submit = async () => {
    const validated = validateMaintenanceRecordForm(values);
    if (!validated.success) {
      setSubmitAttempted(true);
      setErrors(validated.errors);
      setFocusErrorKey(getFirstErrorKey(validated.errors, MAINTENANCE_FORM_FIELD_ORDER));
      return;
    }

    setSubmitting(true);
    setErrors({});
    setFocusErrorKey(null);
    setSaveSuccess(false);
    try {
      if (isEdit && issue) {
        try {
          const payload = issueToMaintenanceUpdate(issue, validated.data);
          await onSave(payload, issue.id);
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Invalid record identifiers — close and reopen this issue.";
          setErrors({ vehicleNumber: message });
          setFocusErrorKey("vehicleNumber");
          return;
        }
      } else {
        await onSave(validated.data);
      }
      await refresh();
      setSaveSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 overflow-auto p-4 sm:p-6">
        <div className={`mx-auto w-full max-w-4xl ${dashboardPanel} shadow-2xl`}>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{heading}</div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{contextLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>

          <div className="max-h-[min(70vh,720px)] overflow-y-auto p-5">
            <MaintenanceRecordForm
              values={values}
              errors={errors}
              onChange={handleChange}
              getComboboxOptions={getComboboxOptions}
              suggestionsLoading={suggestionsLoading}
              suggestionsError={suggestionsError}
              focusErrorKey={focusErrorKey}
              onFocusErrorHandled={handleFocusErrorHandled}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
            {saveSuccess ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                Saved successfully
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={dashboardBtnSecondary} disabled={submitting}>
                Cancel
              </button>
              <button type="button" onClick={() => void submit()} disabled={submitting} className={dashboardBtnPrimary}>
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create record"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
