import {
  ALL_FORM_SUGGESTION_FIELDS,
  isFormSuggestionFieldName,
  type FormSuggestionFieldName,
} from "@/lib/form-suggestions/field-map";
import { clientSuggestionsCache } from "@/lib/form-suggestions/suggestions-cache";

type SuggestionsResponse = {
  field?: string;
  values?: string[];
  suggestions?: Record<FormSuggestionFieldName, string[]>;
  error?: string;
};

async function fetchSuggestionsFromApi(
  fieldName?: string,
  refresh?: boolean,
): Promise<SuggestionsResponse> {
  const params = new URLSearchParams();
  if (fieldName) params.set("field", fieldName);
  if (refresh) params.set("refresh", "1");
  const res = await fetch(`/api/form-suggestions?${params.toString()}`);
  const body = (await res.json()) as SuggestionsResponse;
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to load suggestions (${res.status})`);
  }
  return body;
}

/**
 * Client-side getFieldSuggestions — fetches distinct DB values via API with in-memory cache.
 */
export async function getFieldSuggestions(
  fieldName: string,
  options?: { refresh?: boolean },
): Promise<string[]> {
  if (!isFormSuggestionFieldName(fieldName)) {
    throw new Error(`Unknown suggestion field: ${fieldName}`);
  }

  if (!options?.refresh) {
    const cached = clientSuggestionsCache.get(fieldName);
    if (cached) return cached;
  }

  const body = await fetchSuggestionsFromApi(fieldName, options?.refresh);
  const values = body.values ?? [];
  clientSuggestionsCache.set(fieldName, values);
  return values;
}

/** Prefetch all combobox suggestion lists (used when the form opens). */
export async function getAllFieldSuggestions(options?: {
  refresh?: boolean;
}): Promise<Record<FormSuggestionFieldName, string[]>> {
  if (!options?.refresh) {
    const allCached = ALL_FORM_SUGGESTION_FIELDS.every((f) => clientSuggestionsCache.get(f) !== null);
    if (allCached) {
      return Object.fromEntries(
        ALL_FORM_SUGGESTION_FIELDS.map((f) => [f, clientSuggestionsCache.get(f)!]),
      ) as Record<FormSuggestionFieldName, string[]>;
    }
  }

  const body = await fetchSuggestionsFromApi(undefined, options?.refresh);
  const suggestions = body.suggestions ?? ({} as Record<FormSuggestionFieldName, string[]>);

  for (const field of ALL_FORM_SUGGESTION_FIELDS) {
    clientSuggestionsCache.set(field, suggestions[field] ?? []);
  }

  return suggestions;
}

export function invalidateFieldSuggestionsCache(fieldName?: string): void {
  clientSuggestionsCache.invalidate(fieldName);
}
