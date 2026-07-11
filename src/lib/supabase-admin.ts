import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

export function isSupabaseAdminConfigured(): boolean {
  return url.length > 0 && serviceRoleKey.length > 0;
}

/** Human-readable missing-config detail for server logs (never throws secrets). */
export function getSupabaseAdminConfigError(): string | null {
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is missing on the server.";
  if (!serviceRoleKey) return "SUPABASE_SERVICE_ROLE_KEY is missing on the server.";
  return null;
}

let adminClient: SupabaseClient | null = null;

/** Service-role client — server-only. Never import in client components. */
export function getSupabaseAdminClient(): SupabaseClient {
  const configError = getSupabaseAdminConfigError();
  if (configError) {
    throw new Error(`Supabase admin is not configured. ${configError}`);
  }

  adminClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
