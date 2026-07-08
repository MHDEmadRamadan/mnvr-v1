import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseAdminConfigured(): boolean {
  return url.length > 0 && serviceRoleKey.length > 0;
}

let adminClient: SupabaseClient | null = null;

/** Service-role client — server-only. Never import in client components. */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "Supabase admin is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  adminClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
