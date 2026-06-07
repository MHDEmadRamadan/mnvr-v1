/** Real PostgreSQL boolean columns only (ssh_status, disk_health, device_changed). */

const DEV = process.env.NODE_ENV !== "production";

function warnInvalidBooleanLike(value: unknown): void {
  if (!DEV) return;
  console.warn("Invalid boolean-like value:", value);
}

/**
 * TRUE only: true | "true" | 1 | "1"
 * Everything else → false.
 */
export function coerceDbBoolean(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  if (value === "1") return true;
  if (value === "true") return true;
  if (value === "false" || value === "0" || value === "") return false;

  if (typeof value === "string") {
    warnInvalidBooleanLike(value);
    return false;
  }

  if (typeof value === "number") {
    warnInvalidBooleanLike(value);
    return false;
  }

  warnInvalidBooleanLike(value);
  return false;
}
