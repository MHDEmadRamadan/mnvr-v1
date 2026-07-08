import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/auth";
import { isValidAccessToken } from "@/lib/auth-token";
import { mapProfileRow, PROFILE_SELECT, type ProfileRow } from "@/lib/profile-mapper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type AuthenticatedRequestUser = {
  id: string;
  email: string | null;
  profile: Profile;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!isValidAccessToken(token)) return null;
  return token;
}

/** Supabase client scoped to the caller's JWT (for RLS-enforced server queries). */
export function createSupabaseClientForUser(token: string): SupabaseClient {
  const validToken = isValidAccessToken(token) ? token : "";
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${validToken}` } },
  });
}

export function getBearerToken(request: Request): string | null {
  return bearerToken(request);
}

/**
 * Verify JWT and load profile from the database on every request.
 * Never trusts client-cached roles.
 */
export async function getAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedRequestUser | null> {
  const token = bearerToken(request);
  if (!token || !url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const authed = createSupabaseClientForUser(token);

  const { data: profileRow, error: profileError } = await authed
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profileRow || profileRow.disabled_at) return null;

  return {
    id: userData.user.id,
    email: userData.user.email ?? null,
    profile: mapProfileRow(profileRow as ProfileRow),
  };
}

export async function requireAuthenticated(
  request: Request,
): Promise<AuthenticatedRequestUser | null> {
  return getAuthenticatedUser(request);
}

/** Re-reads role from DB — never uses cached client state. */
export async function requireAdmin(request: Request): Promise<AuthenticatedRequestUser | null> {
  const user = await getAuthenticatedUser(request);
  if (!user || user.profile.role !== "admin") return null;
  return user;
}

/** Returns 401 response when Authorization header is missing or malformed. */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return Response.json({ error: message }, { status: 401 });
}
