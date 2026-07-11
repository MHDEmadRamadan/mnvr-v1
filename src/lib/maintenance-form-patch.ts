import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";

/** Check IMEI/SIM changed when the user enables device replacement (empty replacement values). */
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

export function isReplacementChangeRequired(
  values: Pick<MaintenanceRecordFormValues, "deviceChanged" | "imeiChanged" | "simChanged">,
): { imeiChanged?: string; simChanged?: string } {
  if (!values.deviceChanged) return {};

  const errors: { imeiChanged?: string; simChanged?: string } = {};

  if (values.imeiChanged === null) {
    errors.imeiChanged = "IMEI changed is required when device changed";
  } else if (values.imeiChanged.trim() === "") {
    errors.imeiChanged = "Enter the new IMEI";
  }

  if (values.simChanged === null) {
    errors.simChanged = "SIM changed is required when device changed";
  } else if (values.simChanged.trim() === "") {
    errors.simChanged = "Enter the new SIM";
  }

  return errors;
}
