import type { Profile } from "@/types/auth";

/** True when cached profile no longer matches authoritative permissions for the same user. */
export function havePermissionsChanged(previous: Profile | null, next: Profile): boolean {
  if (!previous) return false;
  if (previous.id !== next.id) return false;
  if (previous.role !== next.role) return true;
  if (Boolean(previous.disabledAt) !== Boolean(next.disabledAt)) return true;
  if (previous.permissionsVersion !== next.permissionsVersion) return true;
  return false;
}

export const AUTH_SYNC_CHANNEL = "mnvr-auth-sync";
export const AUTH_LOGOUT_MESSAGE_KEY = "auth_logout_message";
export const PERMISSION_POLL_INTERVAL_MS = 15_000;

export type AuthSyncMessage =
  | { type: "FORCE_LOGOUT"; message: string }
  | { type: "ACTIVITY"; at: number };
