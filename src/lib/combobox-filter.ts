/** Merge DB suggestions with the current edit value (always visible even if not in DB yet). */
export function mergeSuggestionsWithCurrentValue(
  suggestions: readonly string[],
  currentValue?: string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  for (const v of suggestions) add(v);
  if (currentValue) add(currentValue);

  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** Type-ahead filter: startsWith matches first, then contains. */
export function filterComboboxOptions(options: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const starts: string[] = [];
  const contains: string[] = [];
  for (const opt of options) {
    const lower = opt.toLowerCase();
    if (lower.startsWith(q)) starts.push(opt);
    else if (lower.includes(q)) contains.push(opt);
  }
  return [...starts, ...contains];
}
