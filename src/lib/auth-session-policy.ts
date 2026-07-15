/**
 * Centralized auth session policy (admin + user — identical).
 * Idle: 4h without activity. Absolute lifetime: 24h from login.
 */

export const HOUR_MS = 60 * 60 * 1000;

/** Client-side idle timeout — overridable in tests via NEXT_PUBLIC_AUTH_IDLE_TIMEOUT_MS. */
export const AUTH_IDLE_TIMEOUT_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_AUTH_IDLE_TIMEOUT_MS ?? String(4 * HOUR_MS),
  10,
);

/** Absolute max session lifetime from login — overridable via NEXT_PUBLIC_AUTH_MAX_SESSION_MS. */
export const AUTH_MAX_SESSION_LIFETIME_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_AUTH_MAX_SESSION_MS ?? String(24 * HOUR_MS),
  10,
);

/** How often to re-evaluate idle / max-lifetime while signed in. */
export const AUTH_SESSION_CHECK_INTERVAL_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_AUTH_SESSION_CHECK_INTERVAL_MS ?? String(30_000),
  10,
);

/** Throttle activity writes so high-frequency mouse moves don't thrash storage. */
export const AUTH_ACTIVITY_THROTTLE_MS = 1_000;

export const AUTH_SESSION_STARTED_AT_KEY = "mnvr-auth-session-started-at";
export const AUTH_LAST_ACTIVITY_AT_KEY = "mnvr-auth-last-activity-at";

export type SessionExpiryReason = "idle" | "max_lifetime";

export type SessionPolicyConfig = {
  idleTimeoutMs: number;
  maxSessionLifetimeMs: number;
};

export const DEFAULT_SESSION_POLICY: SessionPolicyConfig = {
  idleTimeoutMs: AUTH_IDLE_TIMEOUT_MS,
  maxSessionLifetimeMs: AUTH_MAX_SESSION_LIFETIME_MS,
};

export function getSessionExpiryMessage(reason: SessionExpiryReason): string {
  if (reason === "idle") {
    return "Your session expired due to inactivity. Please sign in again.";
  }
  return "Your session expired after reaching the maximum 24-hour lifetime. Please sign in again.";
}

/**
 * Decide whether the session must end.
 * Max lifetime is checked first; idle second.
 */
export function evaluateSessionExpiry(
  nowMs: number,
  sessionStartedAtMs: number,
  lastActivityAtMs: number,
  config: SessionPolicyConfig = DEFAULT_SESSION_POLICY,
): SessionExpiryReason | null {
  if (!Number.isFinite(sessionStartedAtMs) || !Number.isFinite(lastActivityAtMs)) {
    return null;
  }
  if (nowMs - sessionStartedAtMs >= config.maxSessionLifetimeMs) {
    return "max_lifetime";
  }
  if (nowMs - lastActivityAtMs >= config.idleTimeoutMs) {
    return "idle";
  }
  return null;
}

export function readStoredTimestamp(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTimestamp(key: string, valueMs: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, String(valueMs));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSessionPolicyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
    localStorage.removeItem(AUTH_LAST_ACTIVITY_AT_KEY);
  } catch {
    // ignore
  }
}

/** Remove Supabase JS persisted auth tokens from local/session storage. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.includes("auth")) {
        localStorage.removeItem(key);
      }
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("sb-") && key.includes("auth")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

/** Resolve when the current browser login started (persisted across reloads/tabs). */
export function resolveSessionStartedAt(lastSignInAtIso: string | undefined, nowMs = Date.now()): number {
  const stored = readStoredTimestamp(AUTH_SESSION_STARTED_AT_KEY);
  if (stored !== null) return stored;

  if (lastSignInAtIso) {
    const fromUser = Date.parse(lastSignInAtIso);
    if (Number.isFinite(fromUser)) {
      writeStoredTimestamp(AUTH_SESSION_STARTED_AT_KEY, fromUser);
      return fromUser;
    }
  }

  writeStoredTimestamp(AUTH_SESSION_STARTED_AT_KEY, nowMs);
  return nowMs;
}

export function markSessionStarted(nowMs = Date.now()): void {
  writeStoredTimestamp(AUTH_SESSION_STARTED_AT_KEY, nowMs);
  writeStoredTimestamp(AUTH_LAST_ACTIVITY_AT_KEY, nowMs);
}

export function markSessionActivity(nowMs = Date.now()): void {
  writeStoredTimestamp(AUTH_LAST_ACTIVITY_AT_KEY, nowMs);
}

export function resolveLastActivityAt(nowMs = Date.now()): number {
  return readStoredTimestamp(AUTH_LAST_ACTIVITY_AT_KEY) ?? nowMs;
}
