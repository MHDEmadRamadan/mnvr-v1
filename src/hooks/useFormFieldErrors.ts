"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFirstErrorKey,
  reconcileFieldErrors,
  scrollAndFocusField,
  type FieldErrors,
} from "@/lib/form-validation";

/** Shared field-level error state with scroll/focus on failed submit. */
export function useFormFieldErrors<T extends string>(fieldOrder: readonly T[]) {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});
  const [focusKey, setFocusKey] = useState<T | null>(null);

  const applyErrors = useCallback((next: Partial<Record<T, string>>) => {
    setErrors(next);
    const first = getFirstErrorKey(next as FieldErrors, fieldOrder);
    setFocusKey((first as T | null) ?? null);
  }, [fieldOrder]);

  const reconcileField = useCallback((changedKey: T, fieldErrors: Partial<Record<T, string>>) => {
    setErrors((prev) =>
      reconcileFieldErrors(
        prev as FieldErrors,
        fieldErrors as FieldErrors,
        [changedKey],
      ) as Partial<Record<T, string>>,
    );
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setFocusKey(null);
  }, []);

  useEffect(() => {
    if (!focusKey) return;
    const timer = window.setTimeout(() => {
      scrollAndFocusField(focusKey);
      setFocusKey(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusKey]);

  return { errors, applyErrors, reconcileField, clearErrors };
}
