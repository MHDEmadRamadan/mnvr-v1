import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  printMaintenanceRpcTestSummary,
  runMaintenanceRpcTestSuite,
} from "@/lib/maintenance-record-test";

/** Dev-only HTTP trigger: GET /api/dev/maintenance-rpc-test */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const report = await runMaintenanceRpcTestSuite(supabase, { stopOnFirstFail: true });
    printMaintenanceRpcTestSummary(report);

    const ok = report.payloadValidation.pass && report.create.pass && report.update.pass;
    return NextResponse.json({ ok, report }, { status: ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test suite failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
