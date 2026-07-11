import { NextResponse } from "next/server";
import { requireAdminServiceConfigured } from "@/lib/admin-api";
import { getBearerToken, requireAdmin, unauthorizedResponse } from "@/lib/auth-server";
import { validatePasswordStrength } from "@/lib/auth-validation";
import { mapProfileRow, mapProfileToApi, PROFILE_SELECT, type ProfileRow } from "@/lib/profile-mapper";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { CreateUserInput, UserRole } from "@/types/auth";

export async function GET(request: Request) {
  if (!getBearerToken(request)) {
    return unauthorizedResponse("Invalid or missing access token.");
  }

  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configError = requireAdminServiceConfigured();
  if (configError) return configError;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users: (data as ProfileRow[]).map((row) => mapProfileToApi(mapProfileRow(row))),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!getBearerToken(request)) {
    return unauthorizedResponse("Invalid or missing access token.");
  }

  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configError = requireAdminServiceConfigured();
  if (configError) return configError;

  let body: CreateUserInput;
  try {
    body = (await request.json()) as CreateUserInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim() ?? "";
  const role: UserRole = body.role === "admin" ? "admin" : "user";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 400 });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: profileRow, error: fetchError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", data.user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: profileRow
        ? mapProfileToApi(mapProfileRow(profileRow as ProfileRow))
        : {
            id: data.user.id,
            email,
            fullName,
            role,
            disabledAt: null,
            permissionsVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
