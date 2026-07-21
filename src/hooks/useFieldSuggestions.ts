"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaintenanceFormFieldConfig } from "@/config/maintenance-form-config";
import { mergeSuggestionsWithCurrentValue } from "@/lib/combobox-filter";
import {
  getAllFieldSuggestions,
  invalidateFieldSuggestionsCache,
} from "@/lib/form-suggestions/suggestions-client";
import type { FormSuggestionFieldName } from "@/lib/form-suggestions/field-map";
import { useAuth } from "@/contexts/AuthContext";

type SuggestionsMap = Partial<Record<FormSuggestionFieldName, string[]>>;

export function useFieldSuggestions(enabled = true) {
  const { getAccessToken } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionsMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllFieldSuggestions(getAccessToken, { refresh });
        setSuggestions(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // Defer so the effect body does not synchronously call setState (React Compiler lint).
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void load(false);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
