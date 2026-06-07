/**
 * End-to-end test + validation layer for maintenance RPC (dev only).
 * Run: npm run test:maintenance-rpc
 * Auto-run on dev server: MAINTENANCE_RPC_TEST_MODE=true
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Issue } from "@/types/issue";
import type { MaintenanceRpcResult } from "@/types/maintenance-rpc";
import { ISSUES_ENRICHED_SELECT } from "@/lib/issues-query";
import {
  issueToMaintenanceUpdate,
  maintenanceFormToRpcPayload,
  mapIssueFromRow,
  type IssueRowWithRelations,
} from "@/lib/issues-mapper";
import {
  deepSanitizeMaintenanceRpcPayload,
  RpcPayloadValidationError,
  safeMaintenanceRpcCall,
  type MaintenanceRpcOperation,
  type MaintenanceRpcPayload,
} from "@/lib/maintenance-record-rpc";
import { emptyMaintenanceRecordForm } from "@/types/maintenance-record";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MaintenanceRpcTestResult = {
  pass: boolean;
  error?: string;
  fieldPath?: string;
  rawSnapshot?: unknown;
  details?: Record<string, unknown>;
};

export type MaintenanceRpcTestReport = {
  payloadValidation: MaintenanceRpcTestResult;
  create: MaintenanceRpcTestResult;
  update: MaintenanceRpcTestResult;
};

function testPass(details?: Record<string, unknown>): MaintenanceRpcTestResult {
  return { pass: true, details };
}

function testFail(
  error: string,
  opts?: { fieldPath?: string; rawSnapshot?: unknown; details?: Record<string, unknown> },
): MaintenanceRpcTestResult {
  return {
    pass: false,
    error,
    fieldPath: opts?.fieldPath,
    rawSnapshot: opts?.rawSnapshot,
    details: opts?.details,
  };
}

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Assert payload has no objects in *_id fields and no [object Object] in JSON. */
export function assertSanitizedPayloadStrict(payload: MaintenanceRpcPayload): void {
  const serialized = JSON.stringify(payload);
  if (serialized.includes("[object Object]")) {
    throw new RpcPayloadValidationError("p", 'serialized payload contains "[object Object]"');
  }

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "object" && value !== null) {
      throw new RpcPayloadValidationError(`p.${key}`, "non-primitive value in sanitized payload");
    }
    if (key.endsWith("_id") && typeof value === "string" && value !== "" && !UUID_RE.test(value)) {
      throw new RpcPayloadValidationError(`p.${key}`, `invalid UUID: ${value}`);
    }
  }
}

/**
 * Task 3 — validate + log sanitized payload BEFORE RPC (throws on invalid; does not call RPC).
 */
export function validateAndLogSanitizedPayload(
  operation: MaintenanceRpcOperation,
  rawPayload: unknown,
): MaintenanceRpcPayload {
  console.info("[maintenance:test:payload:raw]", { operation, rawPayload });

  let sanitized: MaintenanceRpcPayload;
  try {
    sanitized = deepSanitizeMaintenanceRpcPayload(rawPayload, operation);
  } catch (error) {
    if (error instanceof RpcPayloadValidationError) {
      console.error("[maintenance:test:payload:invalid]", {
        operation,
        fieldPath: error.fieldPath,
        message: error.message,
        rawPayload,
      });
    }
    throw error;
  }

  assertSanitizedPayloadStrict(sanitized);
  console.info("[maintenance:test:payload:sanitized]", { operation, sanitized });
  return sanitized;
}

function validateRpcResult(result: MaintenanceRpcResult, context: string): void {
  if (!result.device_id || !UUID_RE.test(result.device_id)) {
    throw new Error(`${context}: device_id is missing or not a valid UUID`);
  }
  if (!Array.isArray(result.issues) || result.issues.length === 0) {
    throw new Error(`${context}: issues array is empty`);
  }

  const serialized = JSON.stringify(result);
  if (serialized.includes("[object Object]")) {
    throw new Error(`${context}: response contains "[object Object]"`);
  }

  for (const [index, row] of result.issues.entries()) {
    if (!row.id || !UUID_RE.test(row.id)) {
      throw new Error(`${context}: issues[${index}].id invalid`);
    }
    if (!row.device_id || !UUID_RE.test(row.device_id)) {
      throw new Error(`${context}: issues[${index}].device_id invalid`);
    }
    if (row.device_id !== result.device_id) {
      throw new Error(`${context}: issues[${index}].device_id does not match device_id`);
    }
  }
}

function buildFullTestForm() {
  const suffix = uniqueTestSuffix();
  return {
    ...emptyMaintenanceRecordForm(),
    vehicleNumber: `TEST-V-${suffix}`,
    vehicleDescription: "Audit test vehicle",
    imei: `9${suffix.replace(/\D/g, "").padEnd(14, "0").slice(0, 14)}`,
    deviceDescription: "Audit test device",
    deviceTickets: `JIRA-${suffix}`,
    softwareVersion: "v2.1",
    flespiStatus: "Online",
    screenStatus: "OK",
    dotmatrixStatus: "OK",
    sshStatus: true,
    pmmSoftware: 1.5,
    deviceStatusDescription: "Status OK",
    motherboardType: "V2",
    pmmType: "PMM-200",
    hardwareDescription: "Hardware OK",
    ssdType: "512GB",
    diskHealth: true,
    powerOnHours: 100,
    powerCycles: 50,
    powerOff: 2,
    lifetime: 1000,
    summarySsd: "SMART OK",
    storageDescription: "Storage OK",
    ssd: "NEW SSD" as const,
    motherboard: "USED" as const,
    sataCable: "NEW" as const,
    imeiChanged: "352625123456789",
    simChanged: "8944501234567890123",
    deviceChanged: true,
    replacementsDescription: "Replaced SSD",
    issueType: "Hardware failure",
    issueSource: "Field visit",
    motherboardIssue: "No boot",
    pmmIssue: "CAM V",
    ssdIssue: "Bad sectors",
    otherIssue: "Cabling",
    issueDescription: "Full audit create test",
  };
}

function buildCreateTestRawPayload() {
  const form = buildFullTestForm();
  return maintenanceFormToRpcPayload(form);
}

async function fetchEnrichedIssue(supabase: SupabaseClient, issueId: string): Promise<Issue> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUES_ENRICHED_SELECT)
    .eq("id", issueId)
    .single();

  if (error) throw new Error(error.message);
  return mapIssueFromRow(data as IssueRowWithRelations);
}

/** Task 1 — create_maintenance_record E2E */
export async function runCreateFlowTest(supabase: SupabaseClient): Promise<MaintenanceRpcTestResult> {
  const rawPayload = buildCreateTestRawPayload();

  try {
    validateAndLogSanitizedPayload("create_maintenance_record", rawPayload);
    const result = await safeMaintenanceRpcCall(supabase, "create_maintenance_record", rawPayload);
    validateRpcResult(result, "create");

    console.info("[maintenance:test:create] result summary", {
      device_id: result.device_id,
      issueCount: result.issues.length,
      issueIds: result.issues.map((i) => i.id),
    });

    return testPass({
      device_id: result.device_id,
      issueCount: result.issues.length,
      issueIds: result.issues.map((i) => i.id),
    });
  } catch (error) {
    const fieldPath = error instanceof RpcPayloadValidationError ? error.fieldPath : undefined;
    return testFail(error instanceof Error ? error.message : "Create test failed", {
      fieldPath,
      rawSnapshot: rawPayload,
    });
  }
}

/** Task 2 — update_maintenance_record E2E (depends on create) */
export async function runUpdateFlowTest(
  supabase: SupabaseClient,
  createResult?: MaintenanceRpcResult,
): Promise<MaintenanceRpcTestResult> {
  let deviceResult = createResult;

  try {
    if (!deviceResult) {
      const raw = buildCreateTestRawPayload();
      validateAndLogSanitizedPayload("create_maintenance_record", raw);
      deviceResult = await safeMaintenanceRpcCall(supabase, "create_maintenance_record", raw);
    }

    validateRpcResult(deviceResult, "create-prerequisite");

    const primaryIssue = [...deviceResult.issues].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    const enriched = await fetchEnrichedIssue(supabase, primaryIssue.id);
    const modifiedForm = {
      ...emptyMaintenanceRecordForm(),
      vehicleNumber: enriched.vehicleNumber ?? "UPDATED",
      vehicleDescription: "Updated by RPC test",
      imei: enriched.deviceImei ?? "",
      issueType: enriched.issueType,
      issueDescription: `Updated at ${new Date().toISOString()}`,
      issueSource: "maintenance-record-test-update",
      motherboardIssue: "updated-mb-issue",
    };

    const rawUpdatePayload = {
      ...issueToMaintenanceUpdate(enriched, modifiedForm),
      vehicle: { id: enriched.vehicleId },
      device: { id: enriched.deviceId, imei: modifiedForm.imei },
      issue: { id: enriched.id },
    };

    validateAndLogSanitizedPayload("update_maintenance_record", rawUpdatePayload);
    const updateResult = await safeMaintenanceRpcCall(supabase, "update_maintenance_record", rawUpdatePayload);
    validateRpcResult(updateResult, "update");

    const updatedRow = updateResult.issues.find((row) => row.id === enriched.id);
    if (!updatedRow) {
      throw new Error(`Updated issue ${enriched.id} not found in returned issues array`);
    }
    if (updatedRow.issue_source !== modifiedForm.issueSource) {
      throw new Error("Updated issue_source does not match payload");
    }

    console.info("[maintenance:test:update] result summary", {
      device_id: updateResult.device_id,
      editedIssueId: enriched.id,
      issueCount: updateResult.issues.length,
      updatedIssueSource: updatedRow.issue_source,
    });

    return testPass({
      device_id: updateResult.device_id,
      editedIssueId: enriched.id,
      issueCount: updateResult.issues.length,
      allIssueIds: updateResult.issues.map((i) => i.id),
    });
  } catch (error) {
    const fieldPath = error instanceof RpcPayloadValidationError ? error.fieldPath : undefined;
    return testFail(error instanceof Error ? error.message : "Update test failed", {
      fieldPath,
    });
  }
}

/** Task 3 — payload validation unit checks (no RPC) */
export function runPayloadValidationTests(): MaintenanceRpcTestResult {
  const cases: { name: string; run: () => void }[] = [
    {
      name: "flatten nested vehicle/device on update",
      run: () => {
        const payload = validateAndLogSanitizedPayload("update_maintenance_record", {
          vehicle: { id: crypto.randomUUID() },
          device: { id: crypto.randomUUID() },
          issue_id: crypto.randomUUID(),
          vehicle_id: crypto.randomUUID(),
          device_id: crypto.randomUUID(),
          issue_type: "test",
        });
        assertSanitizedPayloadStrict(payload);
      },
    },
    {
      name: "reject object without id in issue_id",
      run: () => {
        try {
          deepSanitizeMaintenanceRpcPayload(
            {
              issue_id: { notAnId: true },
              vehicle_id: crypto.randomUUID(),
              device_id: crypto.randomUUID(),
            },
            "update_maintenance_record",
          );
          throw new Error("expected validation to fail");
        } catch (error) {
          if (!(error instanceof RpcPayloadValidationError)) throw error;
        }
      },
    },
    {
      name: "reject [object Object] string",
      run: () => {
        try {
          deepSanitizeMaintenanceRpcPayload(
            {
              issue_id: "[object Object]",
              vehicle_id: crypto.randomUUID(),
              device_id: crypto.randomUUID(),
            },
            "update_maintenance_record",
          );
          throw new Error("expected validation to fail");
        } catch (error) {
          if (!(error instanceof RpcPayloadValidationError)) throw error;
        }
      },
    },
    {
      name: "reject issues array in payload",
      run: () => {
        try {
          deepSanitizeMaintenanceRpcPayload(
            {
              vehicle_number: "TEST",
              imei: "123456789012345",
              issues: [{ id: crypto.randomUUID(), issue_type: "test" }],
            },
            "create_maintenance_record",
          );
          throw new Error("expected validation to fail");
        } catch (error) {
          if (!(error instanceof RpcPayloadValidationError)) throw error;
          if (error.fieldPath !== "p.issues") {
            throw new Error(`expected fieldPath p.issues, got ${error.fieldPath}`);
          }
        }
      },
    },
    {
      name: "create payload with nested entities sanitizes",
      run: () => {
        const payload = validateAndLogSanitizedPayload("create_maintenance_record", buildCreateTestRawPayload());
        assertSanitizedPayloadStrict(payload);
      },
    },
  ];

  try {
    for (const testCase of cases) {
      testCase.run();
    }
    return testPass({ caseCount: cases.length });
  } catch (error) {
    const fieldPath = error instanceof RpcPayloadValidationError ? error.fieldPath : undefined;
    return testFail(error instanceof Error ? error.message : "Payload validation failed", { fieldPath });
  }
}

export function isMaintenanceRpcTestModeEnabled(): boolean {
  return process.env.MAINTENANCE_RPC_TEST_MODE === "true";
}

/** Run full suite — stops on first failure when stopOnFirstFail=true */
export async function runMaintenanceRpcTestSuite(
  supabase: SupabaseClient,
  options?: { stopOnFirstFail?: boolean },
): Promise<MaintenanceRpcTestReport> {
  const stopOnFirstFail = options?.stopOnFirstFail ?? true;

  console.info("[maintenance:test] starting suite…");

  const payloadValidation = runPayloadValidationTests();
  if (stopOnFirstFail && !payloadValidation.pass) {
    return { payloadValidation, create: { pass: false, error: "skipped" }, update: { pass: false, error: "skipped" } };
  }

  let createResult: MaintenanceRpcResult | undefined;
  let create: MaintenanceRpcTestResult;

  const rawCreatePayload = buildCreateTestRawPayload();

  try {
    validateAndLogSanitizedPayload("create_maintenance_record", rawCreatePayload);
    createResult = await safeMaintenanceRpcCall(supabase, "create_maintenance_record", rawCreatePayload);
    validateRpcResult(createResult, "create");
    console.info("[maintenance:test:create] result summary", {
      device_id: createResult.device_id,
      issueCount: createResult.issues.length,
    });
    create = testPass({
      device_id: createResult.device_id,
      issueCount: createResult.issues.length,
    });
  } catch (error) {
    create = testFail(error instanceof Error ? error.message : "Create failed", {
      fieldPath: error instanceof RpcPayloadValidationError ? error.fieldPath : undefined,
      rawSnapshot: rawCreatePayload,
    });
  }

  if (stopOnFirstFail && !create.pass) {
    return { payloadValidation, create, update: { pass: false, error: "skipped" } };
  }

  const update = createResult
    ? await runUpdateFlowTest(supabase, createResult)
    : await runUpdateFlowTest(supabase);

  return { payloadValidation, create, update };
}

export function printMaintenanceRpcTestSummary(report: MaintenanceRpcTestReport): void {
  const line = (label: string, result: MaintenanceRpcTestResult) => {
    const status = result.pass ? "PASS" : "FAIL";
    console.info(`✔ ${label}: ${status}`);
    if (!result.pass) {
      if (result.fieldPath) console.error(`   fieldPath: ${result.fieldPath}`);
      if (result.error) console.error(`   error: ${result.error}`);
      if (result.rawSnapshot) console.error(`   rawSnapshot:`, JSON.stringify(result.rawSnapshot, null, 2));
      if (result.details) console.error(`   details:`, result.details);
    }
  };

  console.info("\n──────── Maintenance RPC Test Summary ────────");
  line("Payload validation", report.payloadValidation);
  line("Create test", report.create);
  line("Update test", report.update);
  console.info("──────────────────────────────────────────────\n");

  const allPass = report.payloadValidation.pass && report.create.pass && report.update.pass;
  if (!allPass) {
    console.error("[maintenance:test] SUITE FAILED");
  } else {
    console.info("[maintenance:test] SUITE PASSED");
  }
}

/** Dev-only auto-run entry (instrumentation / API route). */
export async function runMaintenanceRpcTestModeIfEnabled(supabase: SupabaseClient): Promise<void> {
  if (!isMaintenanceRpcTestModeEnabled()) return;
  if (process.env.NODE_ENV === "production") {
    console.warn("[maintenance:test] MAINTENANCE_RPC_TEST_MODE ignored in production");
    return;
  }

  const report = await runMaintenanceRpcTestSuite(supabase, { stopOnFirstFail: true });
  printMaintenanceRpcTestSummary(report);

  if (!report.payloadValidation.pass || !report.create.pass || !report.update.pass) {
    throw new Error("Maintenance RPC test mode failed — see logs above");
  }
}
