import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  ALL_FORM_SUGGESTION_FIELDS,
  isFormSuggestionFieldName,
  resolveFieldSuggestionSource,
  type FormSuggestionFieldName,
} from "@/lib/form-suggestions/field-map";
import { serverSuggestionsCache } from "@/lib/form-suggestions/suggestions-cache";

const PAGE_SIZE = 1000;

function collectDistinct(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return out;
}

async function fetchDistinctFromTable(table: string, column: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const collected: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to load suggestions from ${table}.${column}: ${error.message}`);

    const rows = data ?? [];
    for (const row of rows) {
      const record = row as unknown as Record<string, unknown>;
      const value = record[column];
      if (typeof value === "string") collected.push(value);
      else if (value != null) collected.push(String(value));
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return collectDistinct(collected);
}

/**
 * Fetch distinct existing values for a whitelisted field from the database.
 * Results are cached server-side for performance.
 */
export async function getFieldSuggestions(
  fieldName: string,
  options?: { refresh?: boolean },
): Promise<string[]> {
  if (!isFormSuggestionFieldName(fieldName)) {
    throw new Error(`Unknown suggestion field: ${fieldName}`);
  }

  if (!options?.refresh) {
    const cached = serverSuggestionsCache.get(fieldName);
    if (cached) return cached;
  }

  const source = resolveFieldSuggestionSource(fieldName);
  if (!source) return [];

  const values = await fetchDistinctFromTable(source.table, source.column);
  serverSuggestionsCache.set(fieldName, values);
  return values;
}

/** Load all autocomplete field suggestions in parallel. */
export async function getAllFieldSuggestions(options?: {
  refresh?: boolean;
}): Promise<Record<FormSuggestionFieldName, string[]>> {
  const entries = await Promise.all(
    ALL_FORM_SUGGESTION_FIELDS.map(async (field) => {
      const values = await getFieldSuggestions(field, options);
      return [field, values] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<FormSuggestionFieldName, string[]>;
}

export function invalidateFieldSuggestionsCache(fieldName?: string): void {
  serverSuggestionsCache.invalidate(fieldName);
}
