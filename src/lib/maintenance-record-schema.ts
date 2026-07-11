import { z } from "zod";
import type { MaintenanceRecordFormValues } from "@/types/maintenance-record";
import { coerceDbBoolean } from "@/lib/coerce-db-boolean";
import { validateReplacementValueFields } from "@/lib/maintenance-form-patch";
import {
  REPLACEMENT_MOTHERBOARD_OPTIONS,
  REPLACEMENT_SATA_CABLE_OPTIONS,
  REPLACEMENT_SSD_OPTIONS,
} from "@/types/replacements";

const optionalDouble = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}, z.number().nullable());

const nonNegativeInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}, z.number().int().min(0));

const strictBoolean = z.preprocess((value) => coerceDbBoolean(value), z.boolean());

export const maintenanceRecordFormSchema = z.object({
  vehicleNumber: z.string().trim().min(1, "Vehicle number is required"),
  vehicleDescription: z.string(),
  imei: z.string().trim().min(1, "Device IMEI is required"),
  deviceDescription: z.string(),
  deviceTickets: z.string(),
  softwareVersion: z.string(),
  flespiStatus: z.string(),
  screenStatus: z.string(),
  dotmatrixStatus: z.string(),
  sshStatus: strictBoolean,
  pmmSoftware: optionalDouble,
  deviceStatusDescription: z.string(),
  motherboardType: z.string(),
  pmmType: z.string(),
  hardwareDescription: z.string(),
  ssdType: z.string(),
  diskHealth: strictBoolean,
  powerOnHours: nonNegativeInt,
  powerCycles: nonNegativeInt,
  powerOff: nonNegativeInt,
  lifetime: nonNegativeInt,
  summarySsd: z.string(),
  storageDescription: z.string(),
  ssd: z.enum(REPLACEMENT_SSD_OPTIONS),
  motherboard: z.enum(REPLACEMENT_MOTHERBOARD_OPTIONS),
  sataCable: z.enum(REPLACEMENT_SATA_CABLE_OPTIONS),
  imeiChanged: z.string().nullable(),
  simChanged: z.string().nullable(),
  deviceChanged: strictBoolean,
  replacementsDescription: z.string(),
  issueType: z.string().trim().min(1, "Issue type is required"),
  motherboardIssue: z.string(),
  pmmIssue: z.string(),
  ssdIssue: z.string(),
  otherIssue: z.string(),
  issueDescription: z.string(),
});

export type MaintenanceRecordFormParsed = z.infer<typeof maintenanceRecordFormSchema>;

function collectMaintenanceRecordErrors(values: MaintenanceRecordFormValues): Record<string, string> {
  const result = maintenanceRecordFormSchema.safeParse(values);
  const replacementErrors = validateReplacementValueFields(values);
  const errors: Record<string, string> = { ...replacementErrors };

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) {
        errors[key] = issue.message;
      }
    }
  }

  return errors;
}

export function validateMaintenanceRecordForm(
  values: MaintenanceRecordFormValues,
): { success: true; data: MaintenanceRecordFormParsed } | { success: false; errors: Record<string, string> } {
  const errors = collectMaintenanceRecordErrors(values);
  const result = maintenanceRecordFormSchema.safeParse(values);

  if (result.success && Object.keys(errors).length === 0) {
    return { success: true, data: result.data };
  }

  return { success: false, errors };
}

/** Revalidate only the fields the user changed. */
export function validateMaintenanceRecordFields(
  values: MaintenanceRecordFormValues,
  changedKeys: (keyof MaintenanceRecordFormValues)[],
): Record<string, string> {
  const allErrors = collectMaintenanceRecordErrors(values);
  const errors: Record<string, string> = {};
  for (const key of changedKeys) {
    if (allErrors[key]) errors[key] = allErrors[key];
  }
  return errors;
}
