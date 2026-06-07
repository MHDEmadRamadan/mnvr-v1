/**
 * replacements.imei_changed / sim_changed — value fields, NOT booleans.
 * DB (target): "false" | IMEI/SIM string | null
 * DB (legacy): boolean columns still return true/false from PostgreSQL
 * UI form: null (no change) | string (new value)
 */

export type ReplacementValue = string | false | null;

export type ReplacementChangeField = "imei_changed" | "sim_changed";

export const REPLACEMENT_VALUE_FIELDS = ["imei_changed", "sim_changed"] as const;

const DEV = process.env.NODE_ENV !== "production";

/** Dev-only: app-layer boolean — not legacy PostgreSQL boolean columns on read. */
export function traceBooleanLeak(
  field: ReplacementChangeField,
  value: unknown,
  context: string,
): void {
  if (!DEV) return;
  if (field === "imei_changed") {
    console.trace("imei_changed invalid boolean leak:", value, context);
  } else {
    console.trace("sim_changed invalid boolean leak:", value, context);
  }
  console.error("BOOLEAN LEAK DETECTED:", { field, value, context });
}

function isNoChangeLiteral(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "false" || normalized === "" || normalized === "no" || normalized === "0";
}

function isLegacyFlagString(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "yes" || normalized === "true";
}

export function isReplacementValueField(key: string): boolean {
  return (REPLACEMENT_VALUE_FIELDS as readonly string[]).includes(key);
}

/** UI display helper */
export function isReplacementNoChange(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === false) return true;
  if (typeof value === "boolean") return value === false;
  if (typeof value === "string") return isNoChangeLiteral(value) || isLegacyFlagString(value);
  return true;
}

/**
 * PostgreSQL legacy boolean columns (read path).
 * false → no change; true → changed flag without stored IMEI/SIM (data not recoverable).
 */
function legacyDbBooleanToUi(_value: boolean): string | null {
  return null;
}

/** DB → UI (form / Issue): legacy boolean / false / null / "false" → null; string → trimmed */
export function dbReplacementValueToUi(
  value: unknown,
  field: ReplacementChangeField,
): string | null {
  if (value === null || value === undefined) return null;
  if (value === false) return null;

  if (typeof value === "boolean") {
    return legacyDbBooleanToUi(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isNoChangeLiteral(trimmed)) return null;
    if (isLegacyFlagString(trimmed)) return null;
    return trimmed;
  }

  if (typeof value === "number") {
    if (value === 0) return null;
    return String(value);
  }

  traceBooleanLeak(field, value, "dbReplacementValueToUi:unexpected-type");
  return null;
}

/** Form state normalizer — rejects booleans and legacy flag strings */
export function normalizeFormReplacementValue(
  value: unknown,
  field: ReplacementChangeField,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") {
    traceBooleanLeak(field, value, "normalizeFormReplacementValue");
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || isNoChangeLiteral(trimmed)) return null;
    if (isLegacyFlagString(trimmed)) {
      traceBooleanLeak(field, trimmed, "normalizeFormReplacementValue:legacy-flag-string");
      return null;
    }
    return trimmed;
  }

  traceBooleanLeak(field, value, "normalizeFormReplacementValue:unexpected-type");
  return null;
}

/** UI form → DB: null/"" → "false"; string → trimmed string. Never boolean. */
export function formReplacementValueToDb(
  value: string | null | undefined,
  field?: ReplacementChangeField,
): string {
  if (typeof value === "boolean") {
    if (field) traceBooleanLeak(field, value, "formReplacementValueToDb");
    return value ? "true" : "false";
  }
  if (value === null || value === undefined) return "false";
  const trimmed = value.trim();
  if (trimmed === "") return "false";
  if (isLegacyFlagString(trimmed) && field) {
    traceBooleanLeak(field, trimmed, "formReplacementValueToDb:legacy-flag-string");
    return "false";
  }
  return trimmed;
}

/** RPC sanitizer — always string, never boolean */
export function sanitizeReplacementValueForDb(
  value: unknown,
  field: ReplacementChangeField,
): string {
  if (value === null || value === undefined || value === false) return "false";

  if (typeof value === "boolean") {
    traceBooleanLeak(field, value, "sanitizeReplacementValueForDb");
    return value ? "true" : "false";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isNoChangeLiteral(trimmed)) return "false";
    if (isLegacyFlagString(trimmed)) {
      traceBooleanLeak(field, trimmed, "sanitizeReplacementValueForDb:legacy-flag-string");
      return "false";
    }
    return trimmed;
  }

  traceBooleanLeak(field, value, "sanitizeReplacementValueForDb:unexpected-type");
  return "false";
}

/** Table/export: stringify DB value exactly — no semantic labels like "No Change". */
export function formatReplacementDbValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && value.trim() === "") return "—";
  return String(value);
}

/** Whether a DB value represents a change (metrics). */
export function hasReplacementChange(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    return !isNoChangeLiteral(trimmed) && !isLegacyFlagString(trimmed);
  }
  return false;
}
