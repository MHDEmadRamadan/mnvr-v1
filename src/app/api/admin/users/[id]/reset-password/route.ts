import { NextResponse } from "next/server";
import { requireAdminServiceConfigured } from "@/lib/admin-api";
import { resetUserPasswordAndInvalidateSessions } from "@/lib/auth-admin";
import { getBearerToken, requireAdmin, unauthorizedResponse } from "@/lib/auth-server";
import { validatePasswordStrength } from "@/lib/auth-validation";
import { mapProfileRow, mapProfileToApi, PROFILE_SELECT, type ProfileRow } from "@/lib/profile-mapper";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ResetUserPasswordInput } from "@/types/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!getBearerToken(request)) {
    return unauthorizedResponse("Invalid or missing access token.");
  }

  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configError = requireAdminServiceConfigured();
  if (configError) return configError;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: ResetUserPasswordInput;
  try {
    body = (await request.json()) as ResetUserPasswordInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = body.password?.trim() ?? "";
  const validationError = validatePasswordStrength(password);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await resetUserPasswordAndInvalidateSessions(id, password);

    const { data: refreshed, error: refreshError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: refreshed ? mapProfileToApi(mapProfileRow(refreshed as ProfileRow)) : null,
      message: "Password reset. All active sessions for this user have been revoked.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
