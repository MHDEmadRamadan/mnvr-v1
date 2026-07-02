/**
 * Pure display formatters — safe to import from both server and client code.
 * (Keep this module free of "use client" so server routes, e.g. report export,
 * can reuse the same formatting as the client table.)
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sanitizeText(value: string | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  const t = value.trim();
  if (UUID_PATTERN.test(t)) return "—";
  return t;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}
