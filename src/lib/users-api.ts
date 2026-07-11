import type { CreateUserInput, Profile, ResetUserPasswordInput, UpdateUserInput, UserRole } from "@/types/auth";
import { isValidAccessToken } from "@/lib/auth-token";

export type AdminUserUpdateResult = Profile & { message?: string };

async function authHeaders(getAccessToken: () => Promise<string | null>): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!isValidAccessToken(token)) {
    throw new Error("Not authenticated. Please sign in again.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await res.json()) as { error?: string };
      if (body.error?.trim()) return body.error.trim();
    } else {
      const text = (await res.text()).trim();
      if (text) {
        // Avoid dumping full HTML error pages into the UI.
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          return fallbackStatusMessage(res.status, fallback);
        }
        return text.slice(0, 280);
      }
    }
  } catch {
    // fall through
  }
  return fallbackStatusMessage(res.status, fallback);
}

function fallbackStatusMessage(status: number, fallback: string): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "Admin access required.";
  if (status === 503) {
    return "Admin user management is not configured on this server. Set SUPABASE_SERVICE_ROLE_KEY and redeploy.";
  }
  if (status >= 500) return "Server error while talking to Supabase. Please retry in a moment.";
  return fallback;
}

export async function fetchAdminUsers(getAccessToken: () => Promise<string | null>): Promise<Profile[]> {
  const res = await fetch("/api/admin/users", {
    headers: await authHeaders(getAccessToken),
  });
  if (!res.ok) throw new Error(await readApiError(res, "Failed to load users"));
  const body = (await res.json()) as { users?: Profile[]; error?: string };
  return body.users ?? [];
}

export async function createAdminUser(
  getAccessToken: () => Promise<string | null>,
  input: CreateUserInput,
): Promise<Profile> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: await authHeaders(getAccessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readApiError(res, "Failed to create user"));
  const body = (await res.json()) as { user?: Profile; error?: string };
  if (!body.user) throw new Error("Invalid server response");
  return body.user;
}

export async function updateAdminUser(
  getAccessToken: () => Promise<string | null>,
  id: string,
  input: UpdateUserInput,
): Promise<AdminUserUpdateResult> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getAccessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readApiError(res, "Failed to update user"));
  const body = (await res.json()) as {
    user?: Profile;
    message?: string;
    sessionsInvalidated?: boolean;
    error?: string;
  };
  if (!body.user) throw new Error("Invalid server response");
  return {
    ...body.user,
    message: body.message,
  };
}

export async function resetAdminUserPassword(
  getAccessToken: () => Promise<string | null>,
  id: string,
  input: ResetUserPasswordInput,
): Promise<{ user: Profile; message: string }> {
  const res = await fetch(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: await authHeaders(getAccessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readApiError(res, "Failed to reset password"));
  const body = (await res.json()) as { user?: Profile | null; message?: string; error?: string };
  return {
    user: body.user ?? ({ id } as Profile),
    message: body.message ?? "Password reset.",
  };
}

export const USER_ROLE_OPTIONS: UserRole[] = ["user", "admin"];
