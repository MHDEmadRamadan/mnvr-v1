/** In-memory TTL cache for field suggestion lists. */

export type SuggestionsCacheEntry = {
  values: string[];
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createSuggestionsCache(defaultTtlMs = DEFAULT_TTL_MS) {
  const store = new Map<string, SuggestionsCacheEntry>();

  function get(key: string): string[] | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.values;
  }

  function set(key: string, values: string[], ttlMs = defaultTtlMs): void {
    store.set(key, { values, expiresAt: Date.now() + ttlMs });
  }

  function invalidate(key?: string): void {
    if (key) store.delete(key);
    else store.clear();
  }

  return { get, set, invalidate };
}

/** Server-side cache (per Node process). */
export const serverSuggestionsCache = createSuggestionsCache();

/** Client-side cache (per browser tab). */
export const clientSuggestionsCache = createSuggestionsCache();
