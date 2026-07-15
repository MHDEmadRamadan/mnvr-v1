"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { isValidAccessToken } from "@/lib/auth-token";
import {
  AUTH_LOGOUT_MESSAGE_KEY,
  AUTH_SYNC_CHANNEL,
  type AuthSyncMessage,
  havePermissionsChanged,
  PERMISSION_POLL_INTERVAL_MS,
} from "@/lib/auth-permissions";
import {
  AUTH_ACTIVITY_THROTTLE_MS,
  AUTH_LAST_ACTIVITY_AT_KEY,
  AUTH_SESSION_CHECK_INTERVAL_MS,
  clearSessionPolicyStorage,
  clearSupabaseAuthStorage,
  evaluateSessionExpiry,
  getSessionExpiryMessage,
  markSessionActivity,
  markSessionStarted,
  readStoredTimestamp,
  resolveLastActivityAt,
  resolveSessionStartedAt,
  type SessionExpiryReason,
} from "@/lib/auth-session-policy";
import { mapProfileRow, PROFILE_SELECT, type ProfileRow } from "@/lib/profile-mapper";
import type { Profile } from "@/types/auth";

const PROFILE_LOAD_TIMEOUT_MS = 15_000;

type ProfileLoadResult =
  | { status: "ok"; profile: Profile }
  | { status: "missing" }
  | { status: "disabled" }
  | { status: "error"; message: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initError: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  retryInit: () => void;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfileForUser(userId: string): Promise<ProfileLoadResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }
  if (!data) {
    return { status: "missing" };
  }

  const mapped = mapProfileRow(data as ProfileRow);
  if (mapped.disabledAt) {
    return { status: "disabled" };
  }

  return { status: "ok", profile: mapped };
}

function storeLogoutMessage(message: string) {
  try {
    sessionStorage.setItem(AUTH_LOGOUT_MESSAGE_KEY, message);
  } catch {
    // ignore
  }
}

function broadcastAuthSync(message: AuthSyncMessage) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileReady, setProfileReady] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [profileRetryKey, setProfileRetryKey] = useState(0);

  const activeUserIdRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);
  const profileRef = useRef<Profile | null>(null);
  const forceLogoutRef = useRef<
    (message?: string, options?: { broadcast?: boolean }) => Promise<void>
  >(async () => {});
  const lastActivityWriteRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const clearAuthState = useCallback(() => {
    activeUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    profileRef.current = null;
    setInitError(null);
    setProfileReady(true);
  }, []);

  const forceLogout = useCallback(
    async (message?: string, options?: { broadcast?: boolean }) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      const logoutMessage =
        message ?? "Your session has ended. Please sign in again.";
      storeLogoutMessage(logoutMessage);

      if (options?.broadcast !== false) {
        broadcastAuthSync({ type: "FORCE_LOGOUT", message: logoutMessage });
      }

      clearSessionPolicyStorage();
      clearAuthState();
      setSessionReady(true);

      try {
        await getSupabaseClient().auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }

      clearSupabaseAuthStorage();
      window.location.replace("/login");
    },
    [clearAuthState],
  );

  useEffect(() => {
    forceLogoutRef.current = forceLogout;
  }, [forceLogout]);

  const expireSession = useCallback((reason: SessionExpiryReason) => {
    void forceLogoutRef.current(getSessionExpiryMessage(reason));
  }, []);

  const recordActivity = useCallback(
    (nowMs = Date.now(), { broadcast = true }: { broadcast?: boolean } = {}) => {
      if (!session?.user?.id || loggingOutRef.current) return;

      if (nowMs - lastActivityWriteRef.current < AUTH_ACTIVITY_THROTTLE_MS) {
        return;
      }
      lastActivityWriteRef.current = nowMs;
      markSessionActivity(nowMs);

      if (broadcast) {
        broadcastAuthSync({ type: "ACTIVITY", at: nowMs });
      }
    },
    [session?.user?.id],
  );

  const applyFreshProfile = useCallback(
    (next: Profile, { allowUpgrade = false }: { allowUpgrade?: boolean } = {}) => {
      const previous = profileRef.current;
      if (previous && havePermissionsChanged(previous, next) && !allowUpgrade) {
        void forceLogoutRef.current(
          "Your permissions have changed. Please sign in again.",
        );
        return false;
      }
      setProfile(next);
      profileRef.current = next;
      return true;
    },
    [],
  );

  // Single auth listener — synchronous only.
  useEffect(() => {
    const supabase = getSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);

      if (event === "SIGNED_OUT" || !nextSession?.user) {
        activeUserIdRef.current = null;
        setProfile(null);
        profileRef.current = null;
        setProfileReady(true);
        setInitError(null);
        if (event === "SIGNED_OUT") {
          clearSessionPolicyStorage();
        }
        return;
      }

      if (event === "SIGNED_IN") {
        loggingOutRef.current = false;
        markSessionStarted(Date.now());
      } else if (event === "INITIAL_SESSION") {
        resolveSessionStartedAt(nextSession.user.last_sign_in_at);
        if (readStoredTimestamp(AUTH_LAST_ACTIVITY_AT_KEY) === null) {
          markSessionActivity(Date.now());
        }
      }

      if (activeUserIdRef.current !== nextSession.user.id) {
        activeUserIdRef.current = nextSession.user.id;
        setProfile(null);
        profileRef.current = null;
        setProfileReady(false);
        setInitError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Idle + max-lifetime enforcement (identical for admin and user).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    resolveSessionStartedAt(session.user?.last_sign_in_at);
    if (readStoredTimestamp(AUTH_LAST_ACTIVITY_AT_KEY) === null) {
      markSessionActivity(Date.now());
    }

    const checkExpiry = () => {
      const now = Date.now();
      const startedAt = resolveSessionStartedAt(session.user?.last_sign_in_at, now);
      const lastActivity = resolveLastActivityAt(now);
      const reason = evaluateSessionExpiry(now, startedAt, lastActivity);
      if (reason) expireSession(reason);
    };

    checkExpiry();
    const intervalId = window.setInterval(checkExpiry, AUTH_SESSION_CHECK_INTERVAL_MS);

    const onActivity = () => recordActivity();
    const activityEvents: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExpiry();
        recordActivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user?.id, session?.user?.last_sign_in_at, recordActivity, expireSession]);

  // Initial + retry profile load.
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!sessionReady || !userId) return;

    const requestId = ++profileRequestIdRef.current;
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelled || requestId !== profileRequestIdRef.current) return;
      setInitError("Profile loading timed out. Please try again.");
      setProfileReady(true);
    }, PROFILE_LOAD_TIMEOUT_MS);

    void (async () => {
      try {
        const result = await fetchProfileForUser(userId);
        if (cancelled || requestId !== profileRequestIdRef.current) return;

        if (result.status === "ok") {
          applyFreshProfile(result.profile, { allowUpgrade: true });
          setInitError(null);
          setProfileReady(true);
          return;
        }

        if (result.status === "disabled") {
          void forceLogoutRef.current("Your account has been disabled.");
          return;
        }

        const message =
          result.status === "missing"
            ? "Your account profile could not be loaded. Contact an administrator."
            : result.message;

        setProfile(null);
        profileRef.current = null;
        setInitError(message);
        setProfileReady(true);
      } catch (error) {
        if (cancelled || requestId !== profileRequestIdRef.current) return;
        setProfile(null);
        profileRef.current = null;
        setInitError(error instanceof Error ? error.message : "Failed to load profile.");
        setProfileReady(true);
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [session?.user?.id, sessionReady, profileRetryKey, applyFreshProfile]);

  // Realtime: detect role/disable/password permission changes immediately.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`profile-permissions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as ProfileRow;
          if (row.id !== userId) return;

          if (row.disabled_at) {
            void forceLogoutRef.current("Your account has been disabled.");
            return;
          }

          const next = mapProfileRow(row);
          const previous = profileRef.current;
          if (previous && havePermissionsChanged(previous, next)) {
            void forceLogoutRef.current(
              "Your permissions have changed. Please sign in again.",
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Poll as fallback when realtime is unavailable.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !profileReady) return;

    const intervalId = window.setInterval(() => {
      void (async () => {
        const result = await fetchProfileForUser(userId);
        if (result.status === "disabled") {
          void forceLogoutRef.current("Your account has been disabled.");
          return;
        }
        if (result.status !== "ok") return;

        const previous = profileRef.current;
        if (previous && havePermissionsChanged(previous, result.profile)) {
          void forceLogoutRef.current(
            "Your permissions have changed. Please sign in again.",
          );
        }
      })();
    }, PERMISSION_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session?.user?.id, profileReady]);

  // Multi-tab synchronization (logout + activity).
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      const data = event.data;
      if (!data?.type) return;

      if (data.type === "FORCE_LOGOUT") {
        void forceLogoutRef.current(data.message, { broadcast: false });
        return;
      }

      if (data.type === "ACTIVITY" && typeof data.at === "number") {
        markSessionActivity(data.at);
        lastActivityWriteRef.current = data.at;
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const retryInit = useCallback(() => {
    setInitError(null);
    if (session?.user?.id) {
      setProfileReady(false);
      setProfileRetryKey((key) => key + 1);
    }
  }, [session?.user?.id]);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      profileRef.current = null;
      return;
    }

    const result = await fetchProfileForUser(userId);
    if (result.status === "ok") {
      applyFreshProfile(result.profile);
      setInitError(null);
    } else if (result.status === "disabled") {
      void forceLogout("Your account has been disabled.");
    } else {
      setProfile(null);
      profileRef.current = null;
      setInitError(
        result.status === "missing"
          ? "Your account profile could not be loaded."
          : result.message,
      );
    }
  }, [session?.user?.id, applyFreshProfile, forceLogout]);

  const signIn = useCallback(async (email: string, password: string) => {
    setInitError(null);
    loggingOutRef.current = false;
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    markSessionStarted(Date.now());
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await forceLogout();
  }, [forceLogout]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const supabase = getSupabaseClient();
      const email = session?.user?.email ?? profile?.email;
      if (!email) return { error: "Not authenticated." };

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) return { error: "Current password is incorrect." };

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };

      void forceLogout("Password updated. Please sign in with your new password.");
      return {};
    },
    [session, profile, forceLogout],
  );

  const getAccessToken = useCallback(async () => {
    recordActivity();
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (!isValidAccessToken(token)) return null;
    return token;
  }, [recordActivity]);

  const userId = session?.user?.id ?? null;
  const needsProfile = sessionReady && userId !== null;
  const loading = !sessionReady || (needsProfile && !profileReady);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      initError,
      isAdmin: profile?.role === "admin",
      isAuthenticated: Boolean(session && profile),
      signIn,
      signOut,
      changePassword,
      refreshProfile,
      retryInit,
      getAccessToken,
    }),
    [
      session,
      profile,
      loading,
      initError,
      signIn,
      signOut,
      changePassword,
      refreshProfile,
      retryInit,
      getAccessToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
