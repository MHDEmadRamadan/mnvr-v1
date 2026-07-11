/** Shared form validation UX utilities — scroll, focus, error reconciliation. */

export type FieldErrors = Record<string, string>;

/** aria-invalid / aria-describedby props for a labeled control. */
export function fieldControlAriaProps(
  controlId: string,
  error?: string,
): {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
} {
  return {
    id: controlId,
    ...(error
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `${controlId}-error`,
        }
      : {}),
  };
}

/** Remove errors for keys that are now valid; keep or set errors for keys still invalid. */
export function reconcileFieldErrors(
  prev: FieldErrors,
  nextErrors: FieldErrors,
  changedKeys: string[],
): FieldErrors {
  const merged = { ...prev };
  for (const key of changedKeys) {
    if (nextErrors[key]) merged[key] = nextErrors[key];
    else delete merged[key];
  }
  return merged;
}

/** First error key in display order (visible fields only). */
export function getFirstErrorKey(
  errors: FieldErrors,
  orderedKeys: readonly string[],
): string | null {
  for (const key of orderedKeys) {
    if (errors[key]) return key;
  }
  return null;
}

/** Sections that contain at least one field with an error. */
export function getSectionsWithErrors(
  errors: FieldErrors,
  fieldSectionMap: Readonly<Record<string, string>>,
): Set<string> {
  const sections = new Set<string>();
  for (const key of Object.keys(errors)) {
    const section = fieldSectionMap[key];
    if (section) sections.add(section);
  }
  return sections;
}

/** Scroll the field wrapper into view and focus its primary control. */
export function scrollAndFocusField(
  fieldKey: string,
  options?: { behavior?: ScrollBehavior },
): boolean {
  if (typeof document === "undefined") return false;

  const root = document.querySelector(`[data-field-key="${fieldKey}"]`);
  if (!root) return false;

  root.scrollIntoView({
    behavior: options?.behavior ?? "smooth",
    block: "center",
  });

  const focusable = root.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([disabled])',
  );
  if (focusable) {
    focusable.focus({ preventScroll: true });
    return true;
  }

  const checkbox = root.querySelector<HTMLElement>('input[type="checkbox"]:not([disabled])');
  checkbox?.focus({ preventScroll: true });
  return Boolean(checkbox);
}
