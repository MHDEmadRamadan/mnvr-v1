"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { LOCKED_COLUMN_KEYS } from "@/lib/issue-row-utils";

const STORAGE_KEY = "mnvr-issues-visible-columns-v6";
const COLUMNS_EVENT = "mnvr-issues-columns-change";

export const DEFAULT_VISIBLE_COLUMNS = [
  "_rowNum",
  "vehicleNumber",
  "deviceImei",
  "softwareVersion",
  "flespiStatus",
  "screenStatus",
  "dotMatrixStatus",
  "issueType",
  "motherboardIssue",
  "pmmIssue",
  "ssdIssue",
  "issueSource",
  "motherboardType",
  "ssdType",
  "diskHealth",
  "powerOnHours",
  "createdAt",
  "description",
] as const;

function mergeLocked(keys: string[]): string[] {
  return [...new Set([...LOCKED_COLUMN_KEYS, ...keys])];
}

function loadStoredColumnKeys(allowedKeys: string[], defaultKeys: string[]): string[] {
  const allowed = new Set(allowedKeys);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeLocked(defaultKeys);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return mergeLocked(defaultKeys);
    const keys = parsed.filter((k): k is string => typeof k === "string" && allowed.has(k));
    return mergeLocked(keys.length > 0 ? keys : defaultKeys);
  } catch {
    return mergeLocked(defaultKeys);
  }
}

function persistColumnKeys(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new CustomEvent(COLUMNS_EVENT, { detail: { source: "local" } }));
}

function serializeKeys(keys: string[]): string {
  return [...keys].sort().join("\0");
}

function parseSerializedKeys(serialized: string): Set<string> {
  const keys = serialized ? serialized.split("\0").filter(Boolean) : [];
  return new Set(keys);
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(COLUMNS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(COLUMNS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Column visibility with SSR-safe hydration.
 *
 * Root cause of prior hydration mismatch: useState(() => readInitialKeys()) read
 * localStorage on the client's first render while the server used defaults →
 * different visible columns → different colSpan in table group headers.
 *
 * useSyncExternalStore guarantees getServerSnapshot (defaults) is used during SSR
 * and during client hydration, then getSnapshot (localStorage) after hydration.
 */
export function useIssueColumns(allKeys: string[]) {
  const defaults = useMemo(
    () => mergeLocked(DEFAULT_VISIBLE_COLUMNS.filter((k) => allKeys.includes(k))),
    [allKeys],
  );

  const serverSnapshot = useMemo(() => serializeKeys(defaults), [defaults]);

  const serialized = useSyncExternalStore(
    subscribe,
    () => serializeKeys(loadStoredColumnKeys(allKeys, defaults)),
    () => serverSnapshot,
  );

  const visibleKeys = useMemo(() => parseSerializedKeys(serialized), [serialized]);
  const visibilityKey = serialized;

  /** True once client snapshot differs from server defaults (localStorage applied). */
  const columnsHydrated = serialized !== serverSnapshot;

  const commitKeys = useCallback((keys: string[]) => {
    persistColumnKeys(mergeLocked(keys));
  }, []);

  const toggleColumn = useCallback(
    (key: string) => {
      if (LOCKED_COLUMN_KEYS.has(key)) return;
      const next = new Set(visibleKeys);
      if (next.has(key)) {
        const unlocked = [...next].filter((k) => !LOCKED_COLUMN_KEYS.has(k));
        if (unlocked.length <= 1 && unlocked[0] === key) return;
        next.delete(key);
      } else {
        next.add(key);
      }
      persistColumnKeys([...next]);
    },
    [visibleKeys],
  );

  const resetColumns = useCallback(() => {
    commitKeys(defaults);
  }, [commitKeys, defaults]);

  const showAllColumns = useCallback(() => {
    commitKeys(allKeys);
  }, [commitKeys, allKeys]);

  const hideAllColumns = useCallback(() => {
    commitKeys([...LOCKED_COLUMN_KEYS]);
  }, [commitKeys]);

  const isLocked = useCallback((key: string) => LOCKED_COLUMN_KEYS.has(key), []);

  return {
    visibleKeys,
    visibilityKey,
    columnsHydrated,
    toggleColumn,
    resetColumns,
    showAllColumns,
    hideAllColumns,
    isLocked,
  };
}
