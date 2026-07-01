/** Escape a single CSV field (quote when it contains comma, quote, or newline). */
export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
