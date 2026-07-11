import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Revoke all refresh tokens and sessions for a user by UUID.
 * Uses DB RPC — NOT auth.admin.signOut(), which expects a JWT (not user id).
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.rpc("revoke_user_sessions", {
    target_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

/** Bump permissions_version so clients detect stale cached roles. */
export async function bumpUserPermissionsVersion(userId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("permissions_version")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!data) throw new Error("User not found");

  const current = Number(data.permissions_version ?? 1);
  const { error } = await supabase
    .from("profiles")
    .update({
      permissions_version: current + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/** Set a new password, bump permissions, and revoke all sessions globally. */
export async function resetUserPasswordAndInvalidateSessions(
  userId: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });
  if (passwordError) throw new Error(passwordError.message);

  await bumpUserPermissionsVersion(userId);
  await invalidateAllUserSessions(userId);
}

/** After role or disable changes — revoke every active session for the target user. */
export async function invalidateSessionsAfterPermissionChange(userId: string): Promise<void> {
  await bumpUserPermissionsVersion(userId);
  await invalidateAllUserSessions(userId);
}
