"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaintenanceFormFieldConfig } from "@/config/maintenance-form-config";
import { mergeSuggestionsWithCurrentValue } from "@/lib/combobox-filter";
import {
  getAllFieldSuggestions,
  invalidateFieldSuggestionsCache,
} from "@/lib/form-suggestions/suggestions-client";
import type { FormSuggestionFieldName } from "@/lib/form-suggestions/field-map";

type SuggestionsMap = Partial<Record<FormSuggestionFieldName, string[]>>;

export function useFieldSuggestions(enabled = true) {
  const [suggestions, setSuggestions] = useState<SuggestionsMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllFieldSuggestions({ refresh });
      setSuggestions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-enable; load() sets loading/suggestions after the async call
    void load(false);
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    invalidateFieldSuggestionsCache();
    await load(true);
  }, [load]);

  const getComboboxOptions = useCallback(
    (field: MaintenanceFormFieldConfig, currentValue?: string | null): string[] => {
      const fieldName = field.suggestionField;
      if (!fieldName) return mergeSuggestionsWithCurrentValue([], currentValue);
      const dbValues = suggestions[fieldName as FormSuggestionFieldName] ?? [];
      return mergeSuggestionsWithCurrentValue(dbValues, currentValue);
    },
    [suggestions],
  );

  return useMemo(
    () => ({ getComboboxOptions, loading, error, refresh }),
    [getComboboxOptions, loading, error, refresh],
  );
}
