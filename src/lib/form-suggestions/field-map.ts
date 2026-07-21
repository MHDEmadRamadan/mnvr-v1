/**
 * Maps autocomplete field names (snake_case DB columns) to table + column.
 * Only whitelisted fields are queryable — prevents arbitrary table access.
 */
export type FormSuggestionFieldName =
  | "software_version"
  | "flespi_status"
  | "screen_status"
  | "dotmatrix_status"
  | "motherboard_type"
  | "pmm_type"
  | "ssd_type"
  | "issue_type"
  | "motherboard_issue"
  | "pmm_issue"
  | "ssd_issue"
  | "other_issue"
  | "vehicle_number"
  | "imei";

export type FieldSuggestionSource = {
  table: "device_status" | "hardware" | "storage" | "issues" | "vehicles" | "device";
  column: string;
};

export const FORM_SUGGESTION_FIELD_SOURCES: Record<FormSuggestionFieldName, FieldSuggestionSource> = {
  software_version: { table: "device_status", column: "software_version" },
  flespi_status: { table: "device_status", column: "flespi_status" },
  screen_status: { table: "device_status", column: "screen_status" },
  dotmatrix_status: { table: "device_status", column: "dotmatrix_status" },
  motherboard_type: { table: "hardware", column: "motherboard_type" },
  pmm_type: { table: "hardware", column: "pmm_type" },
  ssd_type: { table: "storage", column: "ssd_type" },
  issue_type: { table: "issues", column: "issue_type" },
  motherboard_issue: { table: "issues", column: "motherboard_issue" },
  pmm_issue: { table: "issues", column: "pmm_issue" },
  ssd_issue: { table: "issues", column: "ssd_issue" },
  other_issue: { table: "issues", column: "other_issue" },
  vehicle_number: { table: "vehicles", column: "vehicle_number" },
  imei: { table: "device", column: "imei" },
};

export const ALL_FORM_SUGGESTION_FIELDS = Object.keys(
  FORM_SUGGESTION_FIELD_SOURCES,
) as FormSuggestionFieldName[];

export function isFormSuggestionFieldName(value: string): value is FormSuggestionFieldName {
  return value in FORM_SUGGESTION_FIELD_SOURCES;
}

export function resolveFieldSuggestionSource(fieldName: string): FieldSuggestionSource | null {
  if (!isFormSuggestionFieldName(fieldName)) return null;
  return FORM_SUGGESTION_FIELD_SOURCES[fieldName];
}
