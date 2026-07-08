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

export async function fetchAdminUsers(getAccessToken: () => Promise<string | null>): Promise<Profile[]> {
  const res = await fetch("/api/admin/users", {
    headers: await authHeaders(getAccessToken),
  });
  const body = (await res.json()) as { users?: Profile[]; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Failed to load users");
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
  const body = (await res.json()) as { user?: Profile; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Failed to create user");
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
  const body = (await res.json()) as {
    user?: Profile;
    message?: string;
    sessionsInvalidated?: boolean;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? "Failed to update user");
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
  const body = (await res.json()) as { user?: Profile; message?: string; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Failed to reset password");
  if (!body.user) throw new Error("Invalid server response");
  return { user: body.user, message: body.message ?? "Password reset." };
}

export const USER_ROLE_OPTIONS: UserRole[] = ["user", "admin"];
