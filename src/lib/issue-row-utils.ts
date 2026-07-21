import type { Issue } from "@/types/issue";

export const LOCKED_COLUMN_KEYS = new Set(["_rowNum", "vehicleNumber", "deviceImei"]);

export function getIssueRowKey(row: Issue): string {
  return row.id;
}
