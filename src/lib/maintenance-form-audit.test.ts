import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAINTENANCE_FORM_FIELDS } from "@/config/maintenance-form-config";
import { maintenanceRecordFormSchema } from "@/lib/maintenance-record-schema";
import {
  CAMEL_TO_RPC_KEY,
  MAINTENANCE_RPC_FORM_KEYS,
  MAINTENANCE_RPC_KEY_SET,
} from "@/lib/maintenance-rpc-keys";
import { maintenanceFormToRpcPayload } from "@/lib/issues-mapper";
import { emptyMaintenanceRecordForm, type MaintenanceRecordFormValues } from "@/types/maintenance-record";

const FORM_TYPE_KEYS = Object.keys(emptyMaintenanceRecordForm()) as (keyof MaintenanceRecordFormValues)[];
const ZOD_KEYS = Object.keys(maintenanceRecordFormSchema.shape);
const CONFIG_KEYS = MAINTENANCE_FORM_FIELDS.map((f) => f.key);

describe("maintenance form field alignment", () => {
  it("config fields exist on MaintenanceRecordFormValues type defaults", () => {
    for (const key of CONFIG_KEYS) {
      assert.ok(key in emptyMaintenanceRecordForm(), `config field missing from form type: ${key}`);
    }
  });

  it("MaintenanceRecordFormValues keys are covered by config", () => {
    for (const key of FORM_TYPE_KEYS) {
      assert.ok(CONFIG_KEYS.includes(key), `form type key missing from config: ${key}`);
    }
  });

  it("zod schema keys match form type keys", () => {
    assert.deepEqual([...ZOD_KEYS].sort(), [...FORM_TYPE_KEYS].sort());
  });

  it("every form key maps to an RPC payload key", () => {
    for (const key of FORM_TYPE_KEYS) {
      const rpcKey = CAMEL_TO_RPC_KEY[key] ?? key;
      assert.ok(
        MAINTENANCE_RPC_KEY_SET.has(rpcKey),
        `RPC whitelist missing mapped key for ${key}: ${rpcKey}`,
      );
    }
  });

  it("maintenanceFormToRpcPayload covers all RPC form keys", () => {
    const payload = maintenanceFormToRpcPayload(emptyMaintenanceRecordForm());
    for (const rpcKey of MAINTENANCE_RPC_FORM_KEYS) {
      assert.ok(rpcKey in payload, `RPC payload missing key: ${rpcKey}`);
    }
  });

  it("no legacy replacement boolean keys in RPC payload", () => {
    const payload = maintenanceFormToRpcPayload({
      ...emptyMaintenanceRecordForm(),
      ssd: "NEW SSD",
      motherboard: "NEW",
      sataCable: "USED",
      imeiChanged: "352625123456789",
      simChanged: "8944501234567890123",
    });
    assert.equal(payload.ssd, "NEW SSD");
    assert.equal(payload.motherboard, "NEW");
    assert.equal(payload.sata_cable, "USED");
    assert.equal(payload.imei_changed, "352625123456789");
    assert.equal(payload.sim_changed, "8944501234567890123");
    assert.equal("new_ssd" in payload, false);
    assert.equal("new_motherboard" in payload, false);
    assert.equal("new_sata_cable" in payload, false);
    assert.equal("pmm_version" in payload, false);
  });
});
