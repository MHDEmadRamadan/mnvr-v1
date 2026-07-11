import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";

/**
 * Apply a partial update to maintenance form state.
 * One-way rule: turning Device Changed ON auto-enables IMEI/SIM when they are off.
 */
export function applyMaintenanceFormPatch(
  prev: MaintenanceRecordFormValues,
  patch: Partial<MaintenanceRecordFormValues>,
): MaintenanceRecordFormValues {
  const next: MaintenanceRecordFormValues = { ...prev, ...patch };

  if (patch.deviceChanged === true && !prev.deviceChanged) {
    if (next.imeiChanged === null) next.imeiChanged = "";
    if (next.simChanged === null) next.simChanged = "";
  }

  return next;
}

/** When IMEI/SIM changed is checked, require a non-empty replacement value. */
export function validateReplacementValueFields(
  values: Pick<MaintenanceRecordFormValues, "imeiChanged" | "simChanged">,
): { imeiChanged?: string; simChanged?: string } {
  const errors: { imeiChanged?: string; simChanged?: string } = {};

  if (values.imeiChanged !== null && values.imeiChanged.trim() === "") {
    errors.imeiChanged = "Enter the new IMEI";
  }
  if (values.simChanged !== null && values.simChanged.trim() === "") {
    errors.simChanged = "Enter the new SIM";
  }

  return errors;
}
