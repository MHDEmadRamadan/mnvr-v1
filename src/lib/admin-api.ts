import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";

/** JSON 503 when server-only service role key is missing from the deployment env. */
export function adminServiceUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Admin user management is not configured on this server. Set SUPABASE_SERVICE_ROLE_KEY in the production environment, then redeploy.",
    },
    { status: 503 },
  );
}

export function requireAdminServiceConfigured(): NextResponse | null {
  if (!isSupabaseAdminConfigured()) return adminServiceUnavailableResponse();
  return null;
}
