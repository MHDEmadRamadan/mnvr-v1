/**
 * Next.js instrumentation — optional maintenance RPC E2E tests on dev server start.
 * Set MAINTENANCE_RPC_TEST_MODE=true in .env.local
 */

export async function register() {
  if (process.env.MAINTENANCE_RPC_TEST_MODE !== "true") return;
  if (process.env.NODE_ENV === "production") {
    console.warn("[maintenance:test] MAINTENANCE_RPC_TEST_MODE is ignored in production");
    return;
  }

  const { getSupabaseServerClient } = await import("./lib/supabase-server");
  const { runMaintenanceRpcTestModeIfEnabled } = await import("./lib/maintenance-record-test");

  await runMaintenanceRpcTestModeIfEnabled(getSupabaseServerClient());
}
