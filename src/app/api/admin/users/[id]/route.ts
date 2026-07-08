import { NextResponse } from "next/server";
import { invalidateSessionsAfterPermissionChange } from "@/lib/auth-admin";
import { getBearerToken, requireAdmin, unauthorizedResponse } from "@/lib/auth-server";
import { mapProfileRow, mapProfileToApi, PROFILE_SELECT, type ProfileRow } from "@/lib/profile-mapper";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { UpdateUserInput } from "@/types/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!getBearerToken(request)) {
    return unauthorizedResponse("Invalid or missing access token.");
  }

  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: UpdateUserInput;
  try {
    body = (await request.json()) as UpdateUserInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: before, error: beforeError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (beforeError) {
    return NextResponse.json({ error: beforeError.message }, { status: 500 });
  }
  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const beforeProfile = mapProfileRow(before as ProfileRow);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.fullName !== undefined) updates.full_name = body.fullName.trim();
  if (body.role !== undefined) updates.role = body.role;

  if (body.disabled !== undefined) {
    updates.disabled_at = body.disabled ? new Date().toISOString() : null;
  }

  const roleChanged = body.role !== undefined && body.role !== beforeProfile.role;
  const disabledChanged =
    body.disabled !== undefined && Boolean(body.disabled) !== Boolean(beforeProfile.disabledAt);
  const shouldInvalidateSessions = roleChanged || (disabledChanged && Boolean(body.disabled));

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.disabled !== undefined) {
    const banDuration = body.disabled ? "876000h" : "none";
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: banDuration,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  }

  if (shouldInvalidateSessions) {
    try {
      await invalidateSessionsAfterPermissionChange(id);
    } catch (invalidateError) {
      const message =
        invalidateError instanceof Error ? invalidateError.message : "Failed to revoke sessions";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (refreshError) {
    return NextResponse.json({ error: refreshError.message }, { status: 500 });
  }

  const finalRow = refreshed ?? data;
  const finalProfile = mapProfileRow(finalRow as ProfileRow);

  return NextResponse.json({
    user: mapProfileToApi(finalProfile),
    sessionsInvalidated: shouldInvalidateSessions,
    message: shouldInvalidateSessions
      ? "User updated. All active sessions have been revoked."
      : undefined,
  });
}
