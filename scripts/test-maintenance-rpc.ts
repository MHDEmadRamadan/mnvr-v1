/**
 * CLI: npm run test:maintenance-rpc
 * Requires .env.local with Supabase credentials.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";
import {
  printMaintenanceRpcTestSummary,
  runMaintenanceRpcTestSuite,
} from "../src/lib/maintenance-record-test";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Supabase realtime expects WebSocket — polyfill for Node < 22. */
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

function loadEnv(): Record<string, string> {
  const envPath = resolve(__dirname, "../.env.local");
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const testEmail = env.TEST_USER_EMAIL;
  const testPassword = env.TEST_USER_PASSWORD;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  if (!testEmail || !testPassword) {
    console.error(
      "Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in .env.local (required since RPCs need authentication).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signInError) {
    console.error(`Failed to sign in test user (${testEmail}):`, signInError.message);
    process.exit(1);
  }

  const report = await runMaintenanceRpcTestSuite(supabase, { stopOnFirstFail: true });
  printMaintenanceRpcTestSummary(report);

  const ok = report.payloadValidation.pass && report.create.pass && report.update.pass;
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error("[maintenance:test] fatal:", error);
  process.exit(1);
});
