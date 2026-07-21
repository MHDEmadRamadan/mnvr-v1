/**
 * SINGLE enforcement layer for maintenance RPC calls.
 * All create_maintenance_record / update_maintenance_record calls MUST go through safeMaintenanceRpcCall().
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceRpcIssueRow, MaintenanceRpcResult } from "@/types/maintenance-rpc";
import { coerceDbBoolean } from "@/lib/coerce-db-boolean";
import {
  CAMEL_TO_RPC_KEY,
  MAINTENANCE_RPC_KEY_SET,
  toRpcKey,
} from "@/lib/maintenance-rpc-keys";
import {
  sanitizeReplacementValueForDb,
  type ReplacementChangeField,
} from "@/lib/replacements-value-mapper";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MaintenanceRpcOperation = "create_maintenance_record" | "update_maintenance_record";

export type MaintenanceRpcPayload = Record<string, string | boolean | number | null>;

const OPTIONAL_UUID_KEYS = new Set([
  "device_status_id",
  "hardware_id",
  "storage_id",
  "replacements_id",
]);

const REQUIRED_UPDATE_UUID_KEYS = ["issue_id", "vehicle_id", "device_id"] as const;

const BOOLEAN_RPC_KEYS = new Set(["device_changed", "ssh_status", "disk_health"]);

/** replacements.imei_changed / sim_changed — value fields ("false" or IMEI/SIM string) */
const REPLACEMENT_VALUE_RPC_KEYS = new Set(["imei_changed", "sim_changed"]);

/** camelCase relation keys → snake_case RPC keys */
const CAMEL_ID_TO_SNAKE: Record<string, string> = {
  issueId: "issue_id",
  vehicleId: "vehicle_id",
  deviceId: "device_id",
  deviceStatusId: "device_status_id",
  hardwareId: "hardware_id",
  storageId: "storage_id",
  replacementsId: "replacements_id",
};

/** Nested entity keys → flat UUID field */
const NESTED_ENTITY_TO_ID: Record<string, string> = {
  issue: "issue_id",
  vehicle: "vehicle_id",
  device: "device_id",
  device_status: "device_status_id",
  hardware: "hardware_id",
  storage: "storage_id",
  replacements: "replacements_id",
};

export class RpcPayloadValidationError extends Error {
  readonly fieldPath: string;

  constructor(fieldPath: string, message: string) {
    super(`RPC payload invalid at "${fieldPath}": ${message}`);
    this.name = "RpcPayloadValidationError";
    this.fieldPath = fieldPath;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuidKey(key: string): boolean {
  return key.endsWith("_id") || key.endsWith("Id") || key === "id";
}

function toSnakeIdKey(key: string): string {
  if (key in CAMEL_ID_TO_SNAKE) return CAMEL_ID_TO_SNAKE[key];
  if (key.endsWith("_id")) return key;
  if (key === "id") return "issue_id";
  return key;
}

function assertNotObjectString(value: string, fieldPath: string): void {
  if (value.trim() === "[object Object]") {
    throw new RpcPayloadValidationError(
      fieldPath,
      'value is the literal string "[object Object]" — an object was coerced to string',
    );
  }
}

function coerceUuidValue(value: unknown, fieldPath: string, optional: boolean): string {
  if (value === null || value === undefined || value === "") {
    if (optional) return "";
    throw new RpcPayloadValidationError(fieldPath, "UUID is required");
  }

  if (typeof value === "string") {
    assertNotObjectString(value, fieldPath);
    const trimmed = value.trim();
    if (trimmed === "") {
      if (optional) return "";
      throw new RpcPayloadValidationError(fieldPath, "UUID is required");
    }
    if (!UUID_RE.test(trimmed)) {
      throw new RpcPayloadValidationError(fieldPath, `invalid UUID string: ${trimmed.slice(0, 80)}`);
    }
    return trimmed;
  }

  if (Array.isArray(value)) {
    throw new RpcPayloadValidationError(fieldPath, "UUID field must not be an array");
  }

  if (isPlainObject(value)) {
    if ("id" in value) {
      return coerceUuidValue(value.id, `${fieldPath}.id`, optional);
    }
    throw new RpcPayloadValidationError(
      fieldPath,
      `object is not allowed — pass UUID string only: ${JSON.stringify(value).slice(0, 160)}`,
    );
  }

  throw new RpcPayloadValidationError(fieldPath, `expected UUID string, got ${typeof value}`);
}

function coercePrimitive(value: unknown, fieldPath: string): string | boolean | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    assertNotObjectString(value, fieldPath);
    return value;
  }
  if (isPlainObject(value) || Array.isArray(value)) {
    throw new RpcPayloadValidationError(
      fieldPath,
      `nested structure not allowed — got ${Array.isArray(value) ? "array" : "object"}`,
    );
  }
  const asString = String(value);
  assertNotObjectString(asString, fieldPath);
  return asString;
}

/**
 * Flatten camelCase / nested entity shapes into a single-level RPC payload.
 * e.g. { vehicle: { id: "..." } } → { vehicle_id: "..." }
 */
function flattenPayload(input: unknown, basePath = "p"): Record<string, unknown> {
  if (!isPlainObject(input)) {
    throw new RpcPayloadValidationError(basePath, "payload must be a plain object");
  }

  const flat: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const path = `${basePath}.${key}`;

    if (key in NESTED_ENTITY_TO_ID && isPlainObject(value)) {
      const targetKey = NESTED_ENTITY_TO_ID[key];
      if ("id" in value) {
        flat[targetKey] = value.id;
      } else {
        throw new RpcPayloadValidationError(path, `nested "${key}" must include string "id" property`);
      }
      continue;
    }

    if (key in CAMEL_ID_TO_SNAKE) {
      flat[CAMEL_ID_TO_SNAKE[key]] = value;
      continue;
    }

    if (key in CAMEL_TO_RPC_KEY) {
      flat[CAMEL_TO_RPC_KEY[key]] = value;
      continue;
    }

    if (isPlainObject(value)) {
      if ("id" in value && isUuidKey(key)) {
        flat[toSnakeIdKey(key)] = value.id;
        continue;
      }
      throw new RpcPayloadValidationError(path, "unexpected nested object — flatten before RPC");
    }

    if (Array.isArray(value)) {
      throw new RpcPayloadValidationError(path, "arrays are not allowed in RPC payload");
    }

    flat[key] = value;
  }

  return flat;
}

/** Collapse camelCase + snake_case duplicates onto snake_case keys (last wins). */
function normalizeFlatKeys(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    out[toRpcKey(toSnakeIdKey(key))] = value;
  }
  return out;
}

/** Deep sanitize: snake_case primitives only; whitelisted RPC keys. */
export function deepSanitizeMaintenanceRpcPayload(
  raw: unknown,
  operation: MaintenanceRpcOperation,
): MaintenanceRpcPayload {
  const flattened = normalizeFlatKeys(flattenPayload(raw));
  const out: MaintenanceRpcPayload = {};

  for (const [key, value] of Object.entries(flattened)) {
    if (!MAINTENANCE_RPC_KEY_SET.has(key)) continue;

    const path = `p.${key}`;

    if (key.endsWith("_id")) {
      const optional = OPTIONAL_UUID_KEYS.has(key);
      out[key] = coerceUuidValue(value, path, optional);
      continue;
    }

    if (REPLACEMENT_VALUE_RPC_KEYS.has(key)) {
      out[key] = sanitizeReplacementValueForDb(value, key as ReplacementChangeField);
      continue;
    }

    out[key] = coercePrimitive(value, path);
    if (BOOLEAN_RPC_KEYS.has(key)) {
      out[key] = coerceDbBoolean(out[key]);
    }
  }

  if (operation === "update_maintenance_record") {
    for (const required of REQUIRED_UPDATE_UUID_KEYS) {
      if (!(required in out) || out[required] === "") {
        throw new RpcPayloadValidationError(`p.${required}`, "required for update_maintenance_record");
      }
    }
  }

  const serialized = JSON.stringify(out);
  if (serialized.includes("[object Object]")) {
    throw new RpcPayloadValidationError("p", 'serialized payload contains "[object Object]"');
  }

  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "object" && value !== null) {
      throw new RpcPayloadValidationError(`p.${key}`, "non-primitive survived sanitization");
    }
  }

  return out;
}

export function logMaintenanceRpcPayload(operation: string, payload: MaintenanceRpcPayload): void {
  if (process.env.NODE_ENV === "production" && process.env.MAINTENANCE_RPC_DEBUG !== "1") return;
  console.info("[maintenance:rpc:sanitized]", { operation, payload });
}

function parseRpcIssueRow(raw: unknown, index: number): MaintenanceRpcIssueRow {
  if (!isPlainObject(raw)) {
    throw new RpcPayloadValidationError(`return.issues[${index}]`, "issue must be an object");
  }
  return {
    id: coerceUuidValue(raw.id, `return.issues[${index}].id`, false),
    device_id: coerceUuidValue(raw.device_id, `return.issues[${index}].device_id`, false),
    issue_type: typeof raw.issue_type === "string" ? raw.issue_type : null,
    motherboard_issue: typeof raw.motherboard_issue === "string" ? raw.motherboard_issue : null,
    pmm_issue: typeof raw.pmm_issue === "string" ? raw.pmm_issue : null,
    ssd_issue: typeof raw.ssd_issue === "string" ? raw.ssd_issue : null,
    other_issue: typeof raw.other_issue === "string" ? raw.other_issue : null,
    description: typeof raw.description === "string" ? raw.description : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : String(raw.created_at ?? ""),
  };
}

/** Parse RPC jsonb response: { device_id, issues: [...] } */
export function parseMaintenanceRpcResult(data: unknown, operation: string): MaintenanceRpcResult {
  if (!isPlainObject(data)) {
    throw new RpcPayloadValidationError(`${operation}.return`, "expected jsonb object with device_id and issues");
  }

  const device_id = coerceUuidValue(data.device_id, `${operation}.return.device_id`, false);

  if (!("issues" in data)) {
    throw new RpcPayloadValidationError(`${operation}.return`, "missing issues array");
  }

  if (data.issues === null) {
    return { device_id, issues: [] };
  }

  if (!Array.isArray(data.issues)) {
    throw new RpcPayloadValidationError(`${operation}.return.issues`, "issues must be an array");
  }

  const issues = data.issues.map((row, index) => parseRpcIssueRow(row, index));

  if (process.env.NODE_ENV !== "production" || process.env.MAINTENANCE_RPC_DEBUG === "1") {
    console.info("[maintenance:rpc:result]", {
      operation,
      device_id,
      issueCount: issues.length,
      issueIds: issues.map((i) => i.id),
    });
  }

  return { device_id, issues };
}

/**
 * Pick the issue row the caller edited/created from the RPC issues array.
 * - update: match editedIssueId
 * - create: newest by created_at (the row just inserted)
 */
export function pickPrimaryIssueFromRpcResult(
  result: MaintenanceRpcResult,
  editedIssueId?: string,
): MaintenanceRpcIssueRow {
  if (result.issues.length === 0) {
    throw new Error("Maintenance RPC returned no issues for device");
  }

  if (editedIssueId) {
    const match = result.issues.find((row) => row.id === editedIssueId);
    if (match) return match;
    throw new Error(`Edited issue ${editedIssueId} not found in RPC issues array`);
  }

  return [...result.issues].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

/**
 * ONLY allowed path to invoke maintenance RPC functions.
 * Deep-sanitizes payload, validates UUIDs, logs, then calls Supabase.
 */
export async function safeMaintenanceRpcCall(
  supabase: SupabaseClient,
  operation: MaintenanceRpcOperation,
  rawPayload: unknown,
): Promise<MaintenanceRpcResult> {
  let payload: MaintenanceRpcPayload;

  try {
    payload = deepSanitizeMaintenanceRpcPayload(rawPayload, operation);
  } catch (error) {
    if (error instanceof RpcPayloadValidationError) {
      console.error("[maintenance:rpc:blocked]", {
        operation,
        fieldPath: error.fieldPath,
        message: error.message,
        rawPayload,
      });
    }
    throw error;
  }

  logMaintenanceRpcPayload(operation, payload);

  const { data, error } = await supabase.rpc(operation, { p: payload });

  if (error) {
    console.error("[maintenance:rpc:supabase-error]", {
      operation,
      message: error.message,
      payload,
    });
    throw new Error(error.message);
  }

  if (data === null || data === undefined) {
    throw new Error(`${operation} returned null`);
  }

  return parseMaintenanceRpcResult(data, operation);
}

/** Used by issues-mapper for relation UUID coercion. */
export function extractUuidString(value: unknown, fieldName: string): string {
  return coerceUuidValue(value, fieldName, false);
}

export function extractOptionalUuidString(value: unknown, fieldName: string): string {
  return coerceUuidValue(value, fieldName, true);
}
